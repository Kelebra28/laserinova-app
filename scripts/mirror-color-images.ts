/**
 * Copia las fotos POR COLOR del catálogo a archivos webp propios ({slug-modelo}--{slug-color}.webp),
 * junto a las fotos de modelo que deja mirror-catalog-images.ts (misma carpeta: scratch/catalog-img).
 *
 * De dónde sale cada foto:
 *  - Doble Vela: https://doblevela.com/images/large/{MODELO}_{color}_lrg.jpg (misma regla que usa la galería del CRM).
 *    Si ese color no tiene foto propia el proveedor responde 404 y simplemente se omite.
 *  - Modelos TMPS (Amazon S3): cada variante trae su propia foto en la columna `image`.
 *
 * Los modelos con un solo color se omiten: su foto ya es la del modelo.
 *
 * Uso (desde la raíz del CRM):
 *   npx tsx scripts/mirror-color-images.ts --categories=slug1,slug2 --dry
 *   npx tsx scripts/mirror-color-images.ts --categories=slug1,slug2 --limit=5
 *   npx tsx scripts/mirror-color-images.ts --categories=slug1,slug2
 *
 * Cuidado con el proveedor: una petición a la vez, pausa de 1.5–3 s, se reanuda (omite las que ya existen) y se
 * DETIENE tras 3 rechazos seguidos (403/429/5xx). Solo lee de la BD, no escribe nada.
 */
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import { mkdir, writeFile, access } from "fs/promises";
import path from "path";
import { colorImageFile, colorLabel, slugify } from "../src/lib/public-api";

const arg = (n: string) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=")[1];
const flag = (n: string) => process.argv.includes(`--${n}`);
const categories = (arg("categories") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const limit = Number(arg("limit")) || Infinity;
const dry = flag("dry");
const OUT = path.resolve(__dirname, "../scratch/catalog-img");
const S3_HOST = "multimedias3-cloudsync-synology.s3.us-west-2.amazonaws.com";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const exists = (f: string) => access(f).then(() => true, () => false);

/** Misma regla que ProductGallery del CRM para armar la foto de color de Doble Vela. */
const doblevelaColorUrl = (model: string, color: string) =>
  `https://doblevela.com/images/large/${model}_${colorLabel(color).replace(/\s+/g, "").toLowerCase()}_lrg.jpg`;

async function main() {
  if (!categories.length) throw new Error("Falta --categories=slug1,slug2");
  const prisma = new PrismaClient();
  const rows = await prisma.product.findMany({
    where: { active: true, color: { not: null }, category: { active: true, slug: { in: categories } } },
    select: { model: true, sku: true, color: true, image: true },
    orderBy: [{ model: "asc" }, { color: "asc" }],
  });
  await prisma.$disconnect();

  const perModel = new Map<string, typeof rows>();
  for (const r of rows) {
    const k = slugify(r.model ?? r.sku ?? "");
    if (k) perModel.set(k, [...(perModel.get(k) ?? []), r]);
  }

  // [archivo, url]; un solo color por modelo = se omite.
  const jobs = new Map<string, string>();
  let singleColor = 0;
  for (const [modelSlug, list] of perModel) {
    const colors = new Set(list.map((r) => slugify(colorLabel(r.color!))));
    if (colors.size < 2) { singleColor++; continue; }
    for (const r of list) {
      const file = colorImageFile(modelSlug, r.color!);
      if (jobs.has(file)) continue;
      let url: string | null = null;
      try {
        const u = new URL(r.image ?? "");
        if (u.protocol === "https:" && u.host === S3_HOST) url = u.toString();
        else if (u.protocol === "https:" && ["doblevela.com", "www.doblevela.com"].includes(u.host)) url = doblevelaColorUrl(r.model ?? r.sku ?? "", r.color!);
      } catch { /* sin foto utilizable */ }
      if (url) jobs.set(file, url);
    }
  }
  console.log(`Modelos con 2+ colores: ${perModel.size - singleColor} (omitidos ${singleColor} de un solo color). Fotos de color posibles: ${jobs.size}.`);

  await mkdir(OUT, { recursive: true });
  const todo: [string, string][] = [];
  for (const [file, url] of jobs) if (!(await exists(path.join(OUT, file)))) todo.push([file, url]);
  console.log(`Por descargar: ${todo.length} (ya existen ${jobs.size - todo.length}).`);
  if (dry) {
    console.log("Ejemplo:", todo.slice(0, 4));
    return;
  }

  let done = 0, missing = 0, failed = 0, strikes = 0;
  for (const [file, url] of todo) {
    if (done >= limit) break;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; LaserInovaCatalog/1.0; +https://www.laserinova.com)", Accept: "image/*" },
        signal: AbortSignal.timeout(20_000),
      });
      if (res.status === 404) {
        missing++; // ese color no tiene foto propia: es normal
      } else if ([403, 429].includes(res.status) || res.status >= 500) {
        strikes++;
        failed++;
        console.error(`✖ ${file}: HTTP ${res.status} (aviso ${strikes}/3)`);
        if (strikes >= 3) {
          console.error("Demasiados rechazos: me detengo para no molestar al proveedor.");
          break;
        }
      } else if (!res.ok || !(res.headers.get("content-type") ?? "").startsWith("image/")) {
        failed++;
        console.error(`✖ ${file}: HTTP ${res.status} ${res.headers.get("content-type")}`);
      } else {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 10_000_000) throw new Error("archivo demasiado grande");
        const webp = await sharp(buf).rotate().resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
        await writeFile(path.join(OUT, file), webp);
        strikes = 0;
        done++;
        if (done % 25 === 0) console.log(`… ${done} descargadas (${missing} colores sin foto propia)`);
      }
    } catch (e) {
      failed++;
      console.error(`✖ ${file}:`, (e as Error).message);
    }
    await sleep(1500 + Math.random() * 1500);
  }
  console.log(`\nListo. Descargadas: ${done}, colores sin foto propia (404): ${missing}, fallidas: ${failed}. Carpeta: ${OUT}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
