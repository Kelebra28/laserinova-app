// SOLO LECTURA: lista reglas activas con posibles datos sensibles.
import * as dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
dotenv.config();
const prisma = new PrismaClient();

const PATTERNS: [string, RegExp][] = [
  ['tarjeta/cuenta/CLABE', /\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b|clabe|cta\.|cuenta:|bbva|inbursa|banorte|santander/i],
  ['meta/viáticos/interno', /meta comercial|viático|viatico|uso_bot|hospedaje|margen|utilidad|costo interno|\$\s?200,?000/i],
  ['nombre de persona', /raúl|raul|basurto|lena/i],
  ['teléfono/correo personal', /\b\d{2}\s?\d{4}\s?\d{4}\b|@\w+\.\w+/],
];

async function main() {
  const rules = await prisma.agentRule.findMany({ where: { active: true }, orderBy: { namespace: 'asc' } });
  console.log(`Reglas activas: ${rules.length}\n`);
  for (const r of rules) {
    const hits = PATTERNS.filter(([, re]) => re.test(r.content) || re.test(r.title || '')).map(([n]) => n);
    if (!hits.length) continue;
    console.log(`--- id=${r.id} | ${r.namespace} | "${r.title ?? ''}" | ${hits.join(', ')}`);
    console.log(r.content.replace(/\d{4}\s?\d{4}\s?\d{4}\s?(\d{4})/g, '****-****-****-$1').slice(0, 400));
    console.log();
  }
}
main().finally(() => prisma.$disconnect());
