import { CDMX_WAREHOUSES } from "@/constants";
import { doblevelaImageUrl } from "@/constants/urls";

/**
 * Políticas de uso de Doble Vela (documentación del Web Service):
 *  - GetExistencia (un MODELO): habilitada 24 h. Es el método recomendado para mostrar la existencia en tiempo real
 *    cada que el usuario abre el detalle de un producto.
 *  - GetExistenciaAll (todo el catálogo): SOLO de 8:00 PM a 8:00 AM y 1 o varias veces por semana. NUNCA se llama de día
 *    ni para consultar existencias. Este archivo NO la usa y no debe usarla.
 */

/** Un modelo válido: letras, números, punto, guion o espacio (nunca vacío: sin código el servicio podría responder demasiado). */
export const isValidModel = (m: string) => /^[A-Za-z0-9][A-Za-z0-9 ._-]{0,39}$/.test(m);

export async function getDobleVelaStock(modelo: string) {
  if (!isValidModel(modelo)) return null;
  const url = 'http://srv-datos.dyndns.info/doblevela/service.asmx/GetExistencia';
  const params = new URLSearchParams();
  params.append('codigo', modelo);
  params.append('Key', process.env.DOBLE_VELA_KEY || '');

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      signal: AbortSignal.timeout(8_000),
    });
    
    const text = await res.text();
    // Extraer el JSON que viene envuelto en XML
    const match = text.match(/<string[^>]*>(.*)<\/string>/);
    if (!match) return null;

    const data = JSON.parse(match[1]);
    if (data.intCodigo || !data.Resultado || data.Resultado.length === 0) return null;

    // Procesar todos los colores/variantes de ese modelo
    const variantsStock = data.Resultado.map((item: any) => {
      let totalStock = 0;
      CDMX_WAREHOUSES.forEach(num => {
        const val = item[`Disponible Almacen ${num}`] ?? item[`Disponible Almacén ${num}`];
        if (val) {
          totalStock += parseInt(val, 10) || 0;
        }
      });

      return {
        clave: item.CLAVE,
        modelo: item.MODELO,
        color: item.COLOR,
        stockReal: totalStock,
        precioCosto: item.Price || 0,
        imageUrl: doblevelaImageUrl(item.MODELO)
      };
    });

    return variantsStock;
  } catch (error) {
    console.error("Error fetching Doble Vela API:", error);
    return null;
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Existencia en vivo para la tienda pública: con caché, una sola consulta por modelo a la vez y tope por minuto.
// ---------------------------------------------------------------------------------------------------------------------

const TTL_OK = 5 * 60_000; // la misma respuesta se reutiliza 5 min
const TTL_FAIL = 60_000; // si Doble Vela falla, no se insiste durante 1 min
const MAX_UPSTREAM_PER_MIN = 20; // tope de consultas reales a Doble Vela por minuto (por instancia)

type Live = { at: number; ok: boolean; byColor: Map<string, number> | null };
const cache = new Map<string, Live>();
const inflight = new Map<string, Promise<Live>>();
let windowStart = 0;
let windowCount = 0;

const budgetLeft = () => {
  const now = Date.now();
  if (now - windowStart > 60_000) { windowStart = now; windowCount = 0; }
  return windowCount < MAX_UPSTREAM_PER_MIN;
};

/** "04 - ROJO" → "ROJO" (misma regla que el API público). */
const colorName = (c: string) => String(c ?? "").replace(/^\s*\d+\s*-\s*/, "").trim().toUpperCase();

/**
 * Existencia en vivo (suma de almacenes CDMX) por color del MODELO, o null si no se pudo (el llamador usa la BD).
 * Garantías: modelo válido · caché 5 min · una consulta a la vez por modelo · máx. 20 consultas reales/min.
 */
export async function getLiveCdmxStock(modelo: string): Promise<Map<string, number> | null> {
  if (!isValidModel(modelo)) return null;
  const key = modelo.toUpperCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < (hit.ok ? TTL_OK : TTL_FAIL)) return hit.byColor;

  let pending = inflight.get(key);
  if (!pending) {
    if (!budgetLeft()) return hit?.byColor ?? null; // sin cupo: respuesta vieja o la BD
    windowCount++;
    pending = getDobleVelaStock(modelo)
      .then((variants): Live => {
        if (!variants) return { at: Date.now(), ok: false, byColor: null };
        const byColor = new Map<string, number>();
        for (const v of variants as { color: string; stockReal: number }[]) {
          const k = colorName(v.color);
          byColor.set(k, (byColor.get(k) ?? 0) + Math.max(0, v.stockReal));
        }
        return { at: Date.now(), ok: true, byColor };
      })
      .catch((): Live => ({ at: Date.now(), ok: false, byColor: null }))
      .finally(() => inflight.delete(key));
    inflight.set(key, pending);
  }
  const res = await pending;
  cache.set(key, res);
  if (cache.size > 2000) cache.delete(cache.keys().next().value as string);
  return res.byColor;
}
