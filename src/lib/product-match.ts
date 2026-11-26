// Lógica pura: reconoce qué producto del catálogo pidió el cliente. Ante la duda no elige ninguno.

export type CatalogProduct = {
  id: string;
  name: string;
  model?: string | null;
  sku?: string | null;
  color?: string | null;
  provider?: string | null;
};

/** Palabras que describen el trabajo, el material o el color: por sí solas no identifican un modelo. */
const GENERIC = new Set(
  ('para con sin del los las una uno por grabado grabados grabada grabadas laser logo logotipo nombre nombres empresa personalizado ' +
    'personalizados personalizada personalizadas impresion producto productos articulo articulos juego juegos set paquete pieza piezas ' +
    'metal metalico metalica metalicos acero inoxidable madera bambu vidrio ceramica plastico aluminio piel vinipiel acrilico ' +
    'termo termos taza tazas vaso vasos libreta libretas pluma plumas boligrafo boligrafos llavero llaveros caja cajas botella botellas ' +
    'negro negros negra blanco blancos blanca azul marino rojo rosa verde gris plata dorado amarillo naranja morado turquesa claro oscuro ' +
    'mini grande chico mediano promocional promocionales varios evento activacion vivo cliente doble pared')
    .split(' '),
);

/** Un modelo se reconoce por palabras que casi no se repiten entre modelos. */
const MAX_MODELS_PER_WORD = 4;

export const normalizeText = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const words = (s: string) => normalizeText(s).split(/[^a-z0-9]+/).filter(Boolean);

/** "termos" y "termo" son el mismo tipo de artículo. */
const singular = (w: string) => w.replace(/(?<=[^aeiou])es$|s$/, '');

/** Artículos que el cliente puede pedir juntos en un juego: si menciona uno, el producto elegido debe incluirlo. */
const ITEM_TYPES = ['termo', 'taza', 'vaso', 'libreta', 'pluma', 'boligrafo', 'llavero', 'botella', 'mochila', 'tequilero', 'gorra', 'playera', 'usb'];

const modelKey = (p: CatalogProduct) => (p.model ? `${p.provider ?? ''}|${p.model}`.toLowerCase() : p.id);

/** "10 - AZUL CLARO" -> ["azul", "claro"] */
const colorWords = (p: CatalogProduct) => words(p.color ?? '').filter((w) => !/^\d+$/.test(w));

/** Entre los colores del modelo elegido, el que mencione el texto (gana el más específico: "azul marino" sobre "azul"). */
function pickColor<T extends CatalogProduct>(variants: T[], context: Set<string>): T {
  let best = variants[0];
  let bestLength = 0;
  for (const p of variants) {
    const color = colorWords(p);
    if (color.length > bestLength && color.every((w) => context.has(w))) {
      best = p;
      bestLength = color.length;
    }
  }
  return best;
}

/**
 * @param request cómo nombró el producto la solicitud (material y proyecto): de aquí sale el modelo.
 * @param detail texto libre: solo se usa para la clave del proveedor y para el color.
 */
export function findCatalogProduct<T extends CatalogProduct>(products: T[], request: string, detail = ''): T | null {
  const context = new Set(words(`${request} ${detail}`));
  const models = new Map<string, T[]>();
  for (const p of products) {
    const key = modelKey(p);
    models.set(key, [...(models.get(key) ?? []), p]);
  }
  const groups = [...models.values()];

  // 1. Clave del proveedor escrita tal cual (A2636 o A2636.10).
  const fullText = normalizeText(`${request} ${detail}`);
  const bySku = products.find((p) => p.sku && /\d/.test(p.sku) && p.sku.length >= 5 && fullText.split(/[\s(),;]+/).includes(normalizeText(p.sku)));
  if (bySku) return bySku;
  const byCode = groups.filter((g) => {
    const code = normalizeText(g[0].model ?? '');
    return code.length >= 4 && /\d/.test(code) && context.has(code);
  });
  if (byCode.length === 1) return pickColor(byCode[0], context);
  if (byCode.length > 1) return null;

  // 2. Nombre del modelo: todas las palabras distintivas de la solicitud deben estar en un solo modelo.
  const groupWords = groups.map((g) => new Set(g.flatMap((p) => words(p.name))));
  const rare = [...new Set(words(request))].filter((w) => {
    if (w.length < 4 || /\d/.test(w) || GENERIC.has(w)) return false;
    const found = groupWords.filter((set) => set.has(w)).length;
    return found > 0 && found <= MAX_MODELS_PER_WORD;
  });
  if (rare.length === 0) return null;
  const asked = new Set(words(request).map(singular));
  const askedTypes = ITEM_TYPES.filter((t) => asked.has(singular(t)));
  const matches = groups.filter((group, i) => {
    if (!rare.every((w) => groupWords[i].has(w))) return false;
    // El tipo de artículo (primera palabra del nombre) debe estar en la solicitud, y no puede faltar ninguno de los pedidos.
    const kind = singular(words(group[0].name)[0] ?? '');
    const named = new Set([...groupWords[i]].map(singular));
    return asked.has(kind) && askedTypes.every((t) => named.has(singular(t)));
  });
  return matches.length === 1 ? pickColor(matches[0], context) : null;
}
