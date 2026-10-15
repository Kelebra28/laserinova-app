/**
 * Utilerías avanzadas de búsqueda para catálogos y cotizaciones.
 * Soporta:
 * 1. Normalización de tildes/acentos (á -> a, é -> e, etc.)
 * 2. Variaciones singular/plural en español (vaso <-> vasos, pluma <-> plumas, etc.)
 * 3. Sinónimos comunes de la industria promocional / merchandising.
 * 4. Búsqueda multi-token (palabra por palabra) en múltiples campos.
 */

import { PROMOTIONAL_SYNONYMS } from "@/constants";


/**
 * Normaliza un texto quitando tildes, signos y convirtiendo a minúsculas.
 */
export function normalizeText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita tildes
    .toLowerCase()
    .trim();
}

/**
 * Genera variaciones de una palabra:
 * - Forma original normalizada
 * - Singular / Plural en español
 * - Sinónimos de la industria
 */
export function getWordVariations(rawToken: string): string[] {
  const token = normalizeText(rawToken);
  if (!token) return [];

  const variations = new Set<string>();
  variations.add(token);

  // 1. Reglas básicas de singular / plural en español
  if (token.endsWith("es") && token.length > 4) {
    variations.add(token.slice(0, -2)); // ej: colores -> color, relojes -> reloj
    variations.add(token.slice(0, -1)); // ej: tazas -> taza (si terminaba en s)
  } else if (token.endsWith("s") && token.length > 3) {
    variations.add(token.slice(0, -1)); // ej: vasos -> vaso, termos -> termo
  } else {
    variations.add(`${token}s`); // ej: vaso -> vasos
    variations.add(`${token}es`); // ej: color -> colores
  }

  // 2. Sinónimos de la industria
  const synonyms = PROMOTIONAL_SYNONYMS[token];
  if (synonyms) {
    synonyms.forEach(s => variations.add(normalizeText(s)));
  }

  // Si alguna variación singular tiene sinónimos, agregarlos también
  for (const v of Array.from(variations)) {
    const syn = PROMOTIONAL_SYNONYMS[v];
    if (syn) {
      syn.forEach(s => variations.add(normalizeText(s)));
    }
  }

  return Array.from(variations).filter(v => v.length >= 2);
}

/**
 * Construye una cláusula Prisma 'where' para buscar en múltiples campos
 * con soporte para palabras clave múltiples, singular/plural y sinónimos.
 */
export function buildProductSearchWhere(query: string, provider?: string) {
  const where: any = { active: true };

  if (provider) {
    where.provider = provider;
  }

  const cleanQuery = query.trim();
  if (!cleanQuery) {
    return where;
  }

  const tokens = cleanQuery.split(/\s+/).filter(t => t.length > 1);
  if (tokens.length === 0) {
    return where;
  }

  // Cada token debe coincidir en al menos uno de los campos (AND de tokens, OR de campos y variaciones)
  where.AND = tokens.map((token) => {
    const variations = getWordVariations(token);

    return {
      OR: variations.flatMap((v) => [
        { name: { contains: v } },
        { model: { contains: v } },
        { sku: { contains: v } },
        { description: { contains: v } },
        { material: { contains: v } },
        { color: { contains: v } },
        { category: { name: { contains: v } } },
      ]),
    };
  });

  return where;
}
