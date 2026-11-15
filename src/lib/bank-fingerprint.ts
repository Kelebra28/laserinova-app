import { BANK_FINGERPRINT_PREFIX } from "@/constants/reconciliation.constants";
import { normalizeText } from "@/lib/bank-csv";
import type { BankLine } from "@/types/reconciliation";

/**
 * Marca estable de un renglón del banco (fecha + monto + texto + número de repetición).
 * Se guarda en las notas del movimiento que se crea al conciliar, para reconocer ese renglón
 * si se vuelve a subir el mismo estado de cuenta, sin necesitar tablas nuevas.
 */

function hash(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/** id de renglón → marca. Dos renglones idénticos el mismo día reciben #1 y #2. */
export function lineFingerprints(lines: BankLine[]): Map<string, string> {
  const seen = new Map<string, number>();
  const out = new Map<string, string>();
  for (const l of lines) {
    const base = `${l.date}|${l.amount.toFixed(2)}|${hash(normalizeText(l.description))}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    out.set(l.id, `${base}#${n}`);
  }
  return out;
}

export const fingerprintNote = (fp: string) => `[${BANK_FINGERPRINT_PREFIX}${fp}]`;

/** Saca la marca de las notas de un movimiento (o null). */
export function readFingerprint(notes: string | null | undefined): string | null {
  const m = notes?.match(new RegExp(`\\[${BANK_FINGERPRINT_PREFIX}([^\\]]+)\\]`));
  return m ? m[1] : null;
}
