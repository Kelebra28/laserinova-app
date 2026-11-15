import { CHARGE_CATEGORIES, CHARGE_OTHER_CATEGORY, CHARGE_TOP_MERCHANTS, GENERIC_CHARGE_HEADS } from "@/constants/reconciliation.constants";
import type { BankLine, ChargeGroup, ChargesBreakdown } from "@/types/reconciliation";

/** Categoría del cargo según el texto del estado de cuenta (la primera regla que coincide). */
export function categorizeCharge(description: string): { key: string; label: string } {
  const hit = CHARGE_CATEGORIES.find((c) => c.pattern.test(description));
  return hit ? { key: hit.key, label: hit.label } : CHARGE_OTHER_CATEGORY;
}

/** A quién se pagó: el encabezado del renglón, o el concepto cuando el encabezado es genérico ("Pago cuenta de tercero"). */
export function merchantOf(description: string): string {
  const [head, ...rest] = description.split(" · ");
  // Quita folios, números de tienda y un dígito suelto al final ("ADOBE 1").
  const clean = (t: string) => t.replace(/\s+/g, " ").replace(/\b(\d{3,}|[A-Z]{1,2}\d{2,})\b/g, "").replace(/\s+\d{1,2}$/, "").replace(/\s+/g, " ").trim().toUpperCase();
  if (GENERIC_CHARGE_HEADS.test(head) && rest.length) return clean(rest[0]) || clean(head);
  return clean(head) || head.trim().toUpperCase();
}

const groupsOf = (map: Map<string, { label: string; amount: number; count: number }>, total: number): ChargeGroup[] =>
  [...map.entries()]
    .map(([key, g]) => ({ key, label: g.label, amount: Math.round(g.amount * 100) / 100, count: g.count, share: total > 0 ? (g.amount / total) * 100 : 0 }))
    .sort((a, b) => b.amount - a.amount);

/** Cargos del estado de cuenta agrupados por categoría y por comercio (el resto de comercios se junta en "Otros"). */
export function breakdownCharges(lines: BankLine[]): ChargesBreakdown {
  const charges = lines.filter((l) => l.amount < 0);
  const total = charges.reduce((s, l) => s + Math.abs(l.amount), 0);
  const cats = new Map<string, { label: string; amount: number; count: number }>();
  const merchants = new Map<string, { label: string; amount: number; count: number }>();
  for (const l of charges) {
    const amount = Math.abs(l.amount);
    const cat = categorizeCharge(l.description);
    const c = cats.get(cat.key) ?? { label: cat.label, amount: 0, count: 0 };
    c.amount += amount;
    c.count++;
    cats.set(cat.key, c);
    const name = merchantOf(l.description);
    const m = merchants.get(name) ?? { label: name, amount: 0, count: 0 };
    m.amount += amount;
    m.count++;
    merchants.set(name, m);
  }
  const all = groupsOf(merchants, total);
  const top = all.slice(0, CHARGE_TOP_MERCHANTS);
  const rest = all.slice(CHARGE_TOP_MERCHANTS);
  if (rest.length) {
    const amount = rest.reduce((s, g) => s + g.amount, 0);
    top.push({ key: "__rest", label: `Otros (${rest.length} comercios)`, amount: Math.round(amount * 100) / 100, count: rest.reduce((s, g) => s + g.count, 0), share: total > 0 ? (amount / total) * 100 : 0 });
  }
  return { total: Math.round(total * 100) / 100, count: charges.length, byCategory: groupsOf(cats, total), byMerchant: top };
}
