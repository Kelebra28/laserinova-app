import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { existsSync } from "fs";
import { prisma } from "@/lib/prisma";
import path from "path";
import { resolveProductUnitPrice, maxCostOfModel } from "@/lib/pricing";
import { getCostConfigMap } from "@/lib/pricing/server";

/**
 * API pública de catálogo (solo lectura) para el sitio web.
 *
 * Reglas:
 *  - Solo GET, autenticada con una llave de servidor a servidor (PUBLIC_API_KEY).
 *  - Lista blanca de campos: aquí se define lo ÚNICO que sale. Nunca costo, proveedor ni notas.
 *  - Las existencias (piezas) solo salen si PUBLIC_STORE_SHOW_STOCK="true"; los negativos se publican como 0.
 *  - Solo se publican las categorías de PUBLIC_STORE_CATEGORIES (slugs separados por coma). Vacío = nada.
 *  - El precio solo sale si PUBLIC_STORE_SHOW_PRICES="true" (apagado mientras se corrigen las fórmulas).
 */

export const showPrices = () => process.env.PUBLIC_STORE_SHOW_PRICES === "true";
export const showStock = () => process.env.PUBLIC_STORE_SHOW_STOCK === "true";

export const publicCategorySlugs = (): string[] =>
  (process.env.PUBLIC_STORE_CATEGORIES ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Devuelve una respuesta de error si la petición no es válida, o null si puede continuar. */
export function guardPublicApi(request: Request): NextResponse | null {
  const key = process.env.PUBLIC_API_KEY;
  if (!key || key.length < 32) {
    // Sin llave configurada la API queda cerrada (nunca abierta por omisión).
    return NextResponse.json({ error: "No disponible" }, { status: 503 });
  }
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || !safeEqual(token, key)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  // Límite simple por IP: 120 peticiones por minuto (el sitio cachea, así que sobra).
  const ip = (request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  if (!hit(ip)) {
    return NextResponse.json({ error: "Demasiadas peticiones" }, { status: 429, headers: { "Retry-After": "60" } });
  }
  return null;
}

const hits = new Map<string, { n: number; reset: number }>();
function hit(ip: string): boolean {
  const now = Date.now();
  if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  const cur = hits.get(ip);
  if (!cur || cur.reset < now) {
    hits.set(ip, { n: 1, reset: now + 60_000 });
    return true;
  }
  cur.n += 1;
  return cur.n <= 120;
}

export const cacheHeaders = { "Cache-Control": "private, no-store" };

/** Campos de BD que se leen. Nada de unitCost, provider ni notes. stockQuantity solo se publica con PUBLIC_STORE_SHOW_STOCK. */
export const productSelect = {
  id: true,
  sku: true,
  name: true,
  model: true,
  brand: true,
  color: true,
  description: true,
  material: true,
  measurements: true,
  printTechniques: true,
  unitPrice: true,
  unitCost: true,
  provider: true,
  stockQuantity: true,
  category: { select: { name: true, slug: true } },
} as const;

type Row = {
  id: string; sku: string | null; name: string; model: string | null; brand: string | null; color: string | null;
  description: string | null; material: string | null;
  measurements: string | null; printTechniques: string | null; unitPrice: number; unitCost: number; provider: string | null; stockQuantity: number;
  category: { name: string; slug: string };
};

/**
 * Las fotos NO se toman de la BD (apuntan al proveedor): se sirven desde nuestro propio dominio,
 * como {PUBLIC_IMAGE_BASE}/{slug-del-modelo}.webp. Sin PUBLIC_IMAGE_BASE no sale ninguna foto.
 * Si PUBLIC_IMAGE_DIR existe, solo se publica la foto cuando el archivo está en disco.
 */
function imageFor(slug: string): string[] {
  const base = process.env.PUBLIC_IMAGE_BASE?.replace(/\/$/, "");
  if (!base || !/^https:\/\//.test(base) || !slug) return [];
  const dir = process.env.PUBLIC_IMAGE_DIR;
  if (dir && !existsSync(path.join(dir, `${slug}.webp`))) return [];
  return [`${base}/${slug}.webp`];
}

/** Agrupa las variantes (modelo + color) en un producto con colores. DTO público. */
export const colorLabel = (c: string) => c.replace(/^\s*\d+\s*-\s*/, "").trim();

/** Archivo de la foto de un color: {slug-del-modelo}--{slug-del-color}.webp (la misma regla la usa el script que las copia). */
export const colorImageFile = (modelSlug: string, color: string) => `${modelSlug}--${slugify(colorLabel(color))}.webp`;

/** Foto propia de un color, solo si el archivo existe en disco (igual que imageFor). */
function imageForColor(modelSlug: string, color: string): string | undefined {
  const base = process.env.PUBLIC_IMAGE_BASE?.replace(/\/$/, "");
  const dir = process.env.PUBLIC_IMAGE_DIR;
  if (!base || !/^https:\/\//.test(base) || !modelSlug) return undefined;
  // Sin PUBLIC_IMAGE_DIR (p. ej. en Vercel) no se puede saber qué fotos de color existen en el servidor de imágenes:
  // por seguridad NO se publican (evita miniaturas rotas). Solo salen si PUBLIC_COLOR_IMAGES="true" (cuando ya se subieron TODAS).
  if (!dir && process.env.PUBLIC_COLOR_IMAGES !== "true") return undefined;
  const file = colorImageFile(modelSlug, color);
  if (dir && !existsSync(path.join(dir, file))) return undefined;
  return `${base}/${file}`;
}

/** El nombre del proveedor trae el color de la variante al final ("… A2100 NEGRO"): se quita. */
function baseName(name: string, colors: string[]): string {
  let out = name.trim();
  for (const c of colors) {
    const label = colorLabel(c).toUpperCase();
    if (label && out.toUpperCase().endsWith(" " + label)) out = out.slice(0, out.length - label.length).trim();
  }
  return out;
}

/** Existencia publicable: sin negativos ni decimales. */
const pieces = (n: number) => Math.max(0, Math.floor(Number.isFinite(n) ? n : 0));

export function toPublicProduct(rows: Row[], pricing: Record<string, number> = {}) {
  const first = rows[0];
  const slug = slugify(first.model ?? first.sku ?? first.id);
  // Precio de la página = escala de pocas piezas (la más alta); precio manual del producto se respeta.
  const prices = rows.map((r) => resolveProductUnitPrice({ ...r, model: first.model }, 1, pricing, maxCostOfModel({ ...first }, rows.map((x) => ({ ...x, model: first.model })))).unitPrice).filter((p) => p > 0);
  const multiColor = new Set(rows.filter((r) => r.color).map((r) => slugify(colorLabel(r.color!)))).size >= 2;
  return {
    slug,
    model: first.model ?? first.sku,
    name: baseName(first.name, rows.map((r) => r.color ?? "").filter(Boolean)),
    brand: first.brand,
    category: first.category,
    description: first.description,
    material: first.material,
    measurements: first.measurements,
    printTechniques: first.printTechniques,
    images: imageFor(slug),
    colors: rows.filter((r) => r.color).map((r) => {
      // Un modelo de un solo color no tiene foto de color (usa la del modelo; mismo criterio que mirror-color-images.ts).
      const image = multiColor ? imageForColor(slug, r.color!) : undefined;
      return { name: colorLabel(r.color!), sku: r.sku, ...(image ? { image } : {}), ...(showStock() ? { stock: pieces(r.stockQuantity) } : {}) };
    }),
    ...(showPrices() && prices.length ? { priceFrom: Math.min(...prices) } : {}),
    ...(showStock() ? { stock: rows.reduce((n, r) => n + pieces(r.stockQuantity), 0) } : {}),
  };
}

/**
 * La web identifica un producto por su slug ("tmps-195"), pero en la BD el modelo es "TMPS 195".
 * Índice slug → modelo, en memoria 10 min y con una sola consulta ligera (solo modelos distintos).
 */
let modelIndex: { key: string; at: number; ready: Promise<Map<string, string>> } | null = null;
export async function modelForSlug(slug: string, categorySlugs: string[]): Promise<string | null> {
  const key = categorySlugs.join(",");
  if (!modelIndex || modelIndex.key !== key || Date.now() - modelIndex.at > 10 * 60_000) {
    const ready = prisma.product
      .findMany({ where: { active: true, category: { active: true, slug: { in: categorySlugs } } }, select: { model: true }, distinct: ["model"] })
      .then((rows) => new Map(rows.filter((r) => r.model).map((r) => [slugify(r.model!), r.model!] as [string, string])));
    modelIndex = { key, at: Date.now(), ready };
    ready.catch(() => { modelIndex = null; });
  }
  return (await modelIndex.ready).get(slug.toLowerCase()) ?? null;
}

/**
 * Copia en memoria del catálogo público (productos ya agrupados por modelo), válida 10 min.
 * Es UNA sola lectura a la base cada 10 min por instancia, venga quien venga: las ~18 páginas de la lista, las 76
 * categorías y las 1,000+ fichas salen de aquí. Peticiones simultáneas comparten la misma lectura.
 * (Antes, cada página de la lista leía la tabla completa y la web pide todas a la vez al arrancar en frío.)
 */
type PublicProduct = ReturnType<typeof toPublicProduct>;
const CATALOG_TTL = 10 * 60_000;
let catalogCache: { key: string; at: number; ready: Promise<PublicProduct[]> } | null = null;

export function getAllPublicProducts(categorySlugs: string[]): Promise<PublicProduct[]> {
  const key = categorySlugs.join(",");
  if (!catalogCache || catalogCache.key !== key || Date.now() - catalogCache.at > CATALOG_TTL) {
    const ready = Promise.all([
      prisma.product.findMany({
        where: { active: true, category: { active: true, slug: { in: categorySlugs } } },
        select: productSelect,
        orderBy: [{ model: "asc" }, { color: "asc" }],
      }),
      getCostConfigMap(),
    ])
      .then(([rows, pricing]) => {
        const groups = new Map<string, typeof rows>();
        for (const r of rows) {
          const k = r.model ?? r.sku ?? r.id;
          const g = groups.get(k);
          if (g) g.push(r);
          else groups.set(k, [r]);
        }
        return [...groups.values()].map((g) => toPublicProduct(g, pricing));
      });
    const entry = { key, at: Date.now(), ready };
    catalogCache = entry;
    ready.catch(() => { if (catalogCache === entry) catalogCache = null; }); // si falla, la siguiente petición reintenta
  }
  return catalogCache.ready;
}

let categoryCache: { key: string; at: number; ready: Promise<{ name: string; slug: string }[]> } | null = null;
export function getPublicCategories(categorySlugs: string[]) {
  const key = categorySlugs.join(",");
  if (!categoryCache || categoryCache.key !== key || Date.now() - categoryCache.at > CATALOG_TTL) {
    const ready = prisma.productCategory.findMany({ where: { active: true, slug: { in: categorySlugs } }, select: { name: true, slug: true }, orderBy: { name: "asc" } });
    const entry = { key, at: Date.now(), ready };
    categoryCache = entry;
    ready.catch(() => { if (categoryCache === entry) categoryCache = null; });
  }
  return categoryCache.ready;
}

export function slugify(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
