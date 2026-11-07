/**
 * Copia UNA VEZ las fotos del catálogo a archivos webp propios ({slug-del-modelo}.webp),
 * para servirlas desde img.laserinova.com y no depender del servidor del proveedor.
 *
 * Uso (desde la raíz del CRM):
 *   npx tsx scripts/mirror-catalog-images.ts --categories=termos,mochilas,libretas --dry
 *   npx tsx scripts/mirror-catalog-images.ts --categories=termos,mochilas,libretas --limit=5
 *   npx tsx scripts/mirror-catalog-images.ts --categories=termos,mochilas,libretas
 *
 * Cuidado con el proveedor: una petición a la vez, pausa de 1.5–3 s entre fotos, se reanuda (omite las que ya
 * existen) y se DETIENE de inmediato si responde 403/429/5xx repetidos. Solo lee de la BD, no escribe nada.
 */
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import { mkdir, writeFile, access } from "fs/promises";
import path from "path";
import { slugify } from "../src/lib/public-api";

const arg = (n: string) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=")[1];
const flag = (n: string) => process.argv.includes(`--${n}`);
const categories = (arg("categories") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const limit = Number(arg("limit")) || Infinity;
const dry = flag("dry");
const OUT = path.resolve(__dirname, "../scratch/catalog-img");
const ALLOWED_HOSTS = new Set([
  "doblevela.com",
  "www.doblevela.com",
  "multimedias3-cloudsync-synology.s3.us-west-2.amazonaws.com", // fotos de los modelos TMPS (Bebidas, Tecnología, Viaje, Bar)
]);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const exists = (f: string) => access(f).then(() => true, () => false);

async function main() {
  if (!categories.length) throw new Error("Falta --categories=slug1,slug2");
  const prisma = new PrismaClient();
  const rows = await prisma.product.findMany({
    where: { active: true, category: { active: true, slug: { in: categories } } },
    select: { model: true, sku: true, image: true },
    orderBy: { model: "asc" },
  });
  await prisma.$disconnect();

  // Una foto por modelo (la primera variante que tenga una URL permitida).
  const byModel = new Map<string, string>();
  const noImage: string[] = [];
  for (const r of rows) {
    const key = slugify(r.model ?? r.sku ?? "");
    if (!key || byModel.has(key)) continue;
    try {
      const u = new URL(r.image ?? "");
      if (u.protocol === "https:" && ALLOWED_HOSTS.has(u.host)) byModel.set(key, u.toString());
      else noImage.push(key);
    } catch {
      noImage.push(key);
    }
  }
  console.log(`Modelos: ${byModel.size} con foto de proveedor, ${new Set(noImage).size} sin foto utilizable.`);

  await mkdir(OUT, { recursive: true });
  const todo: [string, string][] = [];
  for (const [slug, url] of byModel) if (!(await exists(path.join(OUT, `${slug}.webp`)))) todo.push([slug, url]);
  console.log(`Por descargar: ${todo.length} (ya existen ${byModel.size - todo.length}).`);
  if (dry) {
    console.log("Ejemplo:", todo.slice(0, 3));
    return;
  }

  let done = 0, failed = 0, strikes = 0;
  for (const [slug, url] of todo) {
    if (done >= limit) break;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; LaserInovaCatalog/1.0; +https://www.laserinova.com)", Accept: "image/*" },
        signal: AbortSignal.timeout(20_000),
      });
      if ([403, 429].includes(res.status) || res.status >= 500) {
        strikes++;
        console.error(`✖ ${slug}: HTTP ${res.status} (aviso ${strikes}/3)`);
        if (res.status !== 404 && strikes >= 3) {
          console.error("Demasiados rechazos: me detengo para no molestar al proveedor.");
          break;
        }
        failed++;
      } else if (!res.ok || !(res.headers.get("content-type") ?? "").startsWith("image/")) {
        console.error(`✖ ${slug}: HTTP ${res.status} ${res.headers.get("content-type")}`);
        failed++;
      } else {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 10_000_000) throw new Error("archivo demasiado grande");
        const webp = await sharp(buf).rotate().resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
        await writeFile(path.join(OUT, `${slug}.webp`), webp);
        strikes = 0;
        done++;
        console.log(`✔ ${slug}.webp (${Math.round(webp.length / 1024)} KB)`);
      }
    } catch (e) {
      failed++;
      console.error(`✖ ${slug}:`, (e as Error).message);
    }
    await sleep(1500 + Math.random() * 1500);
  }
  console.log(`\nListo. Descargadas: ${done}, fallidas: ${failed}. Carpeta: ${OUT}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
