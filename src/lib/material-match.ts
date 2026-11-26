// Lógica pura: qué material del catálogo pidió la solicitud. Ante la duda no elige ninguno.
import { normalizeText } from '@/lib/product-match';

export type CatalogMaterial = {
  id: string;
  name: string;
  thickness?: number | null;
  length?: number | null;
  width?: number | null;
  sheetPrice?: number | null;
  guardPercentage?: number | null;
  pricePerCm2?: number | null;
};

/** Registros repetidos con los mismos datos de costo dan el mismo precio: da igual cuál se tome. */
const costKey = (m: CatalogMaterial) => [m.length, m.width, m.sheetPrice, m.guardPercentage, m.pricePerCm2].join('|');

/** Palabras que no cambian de qué material se habla. */
const FILLER = new Set(['de', 'en', 'solido', 'lamina', 'hoja']);

const clean = (s: string) => normalizeText(s).replace(/\s+/g, ' ').trim();

const MEASURE = /(\d+(?:\.\d+)?)\s*(mm|cm|pts)\b/g;
const SHEET_SIZE = /\d+(?:\.\d+)?\s*x\s*\d+(?:\.\d+)?/g;

/** Grosores en mm mencionados en el texto. */
const thicknesses = (s: string) =>
  [...clean(s).matchAll(MEASURE)].filter((m) => m[2] !== 'pts').map((m) => Number(m[1]) * (m[2] === 'cm' ? 10 : 1));

/** Las palabras del material, sin grosor, medida de lámina ni relleno. */
const materialWords = (s: string) =>
  [...new Set(clean(s).replace(SHEET_SIZE, ' ').replace(MEASURE, ' ').split(/[^a-z0-9]+/).filter((w) => w && !FILLER.has(w)))].sort().join(' ');

export function findCatalogMaterial<T extends CatalogMaterial>(materials: T[], request: string): T | null {
  // 1. Nombre tal cual (es lo que manda el bot cuando ya identificó el material).
  const literal = materials.filter((m) => m.name.trim() === request.trim());
  if (literal.length === 1) return literal[0];

  // 2. Mismas palabras y mismo grosor, y que solo quede una opción. Sin grosor, solo si el material tiene una sola.
  const asked = thicknesses(request);
  const askedWords = materialWords(request);
  if (!askedWords || new Set(asked).size > 1) return null;
  const matches = materials.filter((m) => {
    if (materialWords(m.name) !== askedWords) return false;
    if (asked.length === 0) return true;
    return (m.thickness || thicknesses(m.name)[0]) === asked[0];
  });
  return matches.length > 0 && new Set(matches.map(costKey)).size === 1 ? matches[0] : null;
}
