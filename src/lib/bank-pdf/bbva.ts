import { PDF_LINE_TOLERANCE, PDF_MONTH_CODES, PDF_TOTAL_TOLERANCE } from "@/constants/reconciliation.constants";
import type { BankLine } from "@/types/reconciliation";
import type { ParsedStatement, PdfPage, PdfTextItem, StatementCheck } from "@/types/bank-statement";

/**
 * Lector del estado de cuenta BBVA (Maestra PYME y similares), a partir del texto con coordenadas.
 * Los cargos, abonos y saldos caen en columnas fijas: se separan por el punto medio entre los títulos
 * de cada columna. Luego se comprueba todo contra los totales y los saldos que el banco imprime.
 */

const MAX_DESCRIPTION = 160;
const MONEY = /^-?\d{1,3}(,\d{3})*\.\d{2}$/;
const DATE = /^(\d{2})\/([A-Z]{3})$/;
const toNumber = (s: string) => parseFloat(s.replace(/,/g, ""));
const round2 = (n: number) => Math.round(n * 100) / 100;
const pad = (n: number) => String(n).padStart(2, "0");

type Columns = { cargoMax: number; abonoMax: number; saldoOpMax: number; descFrom: number };
type Raw = { date: string; description: string[]; details: string[]; cargo: number | null; abono: number | null; saldoOp: number | null; saldoLiq: number | null };

/**
 * Algunas librerías de PDF entregan varias palabras juntas en un solo fragmento ("26/OCT 26/OCT PAGO...").
 * Se separan en palabras repartiendo el ancho del fragmento, para que el resto del lector no dependa de eso.
 */
function explode(items: PdfTextItem[]): PdfTextItem[] {
  return items.flatMap((it) => {
    if (!/\s/.test(it.text.trim())) return [{ ...it, text: it.text.trim() }];
    const total = it.text.length || 1;
    const out: PdfTextItem[] = [];
    for (const m of it.text.matchAll(/\S+/g)) {
      const start = m.index ?? 0;
      out.push({ text: m[0], y: it.y, x0: it.x0 + ((it.x1 - it.x0) * start) / total, x1: it.x0 + ((it.x1 - it.x0) * (start + m[0].length)) / total });
    }
    return out;
  });
}

/** Renglones de una página: fragmentos agrupados por altura y ordenados de izquierda a derecha. */
function toLines(items: PdfTextItem[]): PdfTextItem[][] {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x0 - b.x0);
  const lines: PdfTextItem[][] = [];
  for (const it of sorted) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(last[0].y - it.y) <= PDF_LINE_TOLERANCE) last.push(it);
    else lines.push([it]);
  }
  return lines.map((l) => l.sort((a, b) => a.x0 - b.x0));
}

const lineText = (l: PdfTextItem[]) => l.map((i) => i.text).join(" ");

/** Límites de las columnas a partir de la fila de títulos (CARGOS, ABONOS, OPERACIÓN, LIQUIDACIÓN). */
function findColumns(lines: PdfTextItem[][]): { columns: Columns; headerIndex: number } | null {
  for (let i = 0; i < lines.length; i++) {
    const find = (t: string) => lines[i].find((w) => w.text.toUpperCase().replace("Ó", "O") === t);
    const cargos = find("CARGOS"), abonos = find("ABONOS"), oper = find("OPERACION"), liq = find("LIQUIDACION");
    if (cargos && abonos && oper && liq) {
      const desc = lines[i].find((w) => w.text.toUpperCase().startsWith("DESCRIP"));
      return {
        headerIndex: i,
        columns: {
          cargoMax: (cargos.x1 + abonos.x1) / 2,
          abonoMax: (abonos.x1 + oper.x1) / 2,
          saldoOpMax: (oper.x1 + liq.x1) / 2,
          descFrom: (desc?.x0 ?? 85) - 2,
        },
      };
    }
  }
  return null;
}

/** Quita lo que no sirve para identificar el movimiento y rescata el concepto que escribió quien pagó. */
function cleanDetail(text: string, holder: string | null): string | null {
  const full = text.trim();
  if (!full) return null;
  // "… Referencia 0104635121 036": el número de referencia es ruido, pero a veces trae texto útil (GUIA:7031628).
  const [headRaw, ...refParts] = full.split(/\s+Referencia\s+/i);
  const refPart = refParts.join(" ").trim();
  const refUseful = /[A-Za-z]{3,}/.test(refPart) && !/^\*+\d+$/.test(refPart) ? refPart : null;
  const t = headRaw.trim();

  const concept = (() => {
    if (!t) return null;
    if (holder && t.toUpperCase() === holder.toUpperCase()) return null; // nombre del titular (beneficiario)
    if (/^\*+\d+/.test(t) || /^RFC:/i.test(t)) return null; // tarjeta, RFC del comercio, hora y autorización
    if (/^[0-9A-Z]{14,}$/.test(t) || /NAPP|^\d{18,}/.test(t)) return null; // claves de rastreo
    if (/^REF:\d+(\s+CIE:\d+)?$/i.test(t)) return null; // referencia de pago de servicios
    const spei = t.match(/^(?:\d+\s+\d{3}\s+)?\d{7}(\D.*)?$/); // (referencia, banco,) fecha o folio de 7 dígitos y concepto pegados
    if (spei) return spei[1]?.trim() || null;
    const bnet = t.match(/^(?:\d+\s+)?BNET\s+\d+\s*(.*)$/i); // transferencia BBVA net: lo último es el concepto
    if (bnet) return bnet[1].trim() || null;
    return t.replace(/^\d{6,}\s+/, "").trim() || null;
  })();

  return [concept, refUseful].filter(Boolean).join(" ") || null;
}

/** Encabezado que BBVA repite arriba de cada página (y pie), que no es parte de ningún movimiento. */
const PAGE_NOISE = /Estado\s+de\s+Cuenta|PAGINA\s+\d+\s*\/\s*\d+|No\.\s*de\s*(Cuenta|Cliente)|Libret[oó]n|MAESTRA|PYME|Cuenta\s+Digital|BBVA\s+MEXICO|Av\.\s+Paseo\s+de\s+la\s+Reforma|La\s+GAT\s+Real/i;

/** Une el texto principal y los detalles sin repetir lo que ya dice otro detalle, y con un tope de largo. */
function joinDetails(head: string, details: string[]): string {
  const clean = details.map((d) => d.replace(/\b\d{2,3}-\d{2}\/\d{2}\/\d{4}\/\S+/g, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const key = (x: string) => x.toLowerCase().replace(/[^a-z0-9]/g, "");
  const unique = clean.filter((d, i) => !clean.some((o, j) => j !== i && key(o).includes(key(d)) && (key(o).length > key(d).length || j < i)));
  const text = [head, ...unique].filter(Boolean).join(" · ");
  return text.length > MAX_DESCRIPTION ? `${text.slice(0, MAX_DESCRIPTION - 1)}…` : text;
}

export function parseBbvaStatement(rawPages: PdfPage[]): ParsedStatement {
  const pages = rawPages.map(explode);
  const allText = pages.flatMap((p) => toLines(p).map(lineText));
  const warnings: string[] = [];

  const period = allText.join("\n").match(/Periodo\s+DEL\s+(\d{2})\/(\d{2})\/(\d{4})\s+AL\s+(\d{2})\/(\d{2})\/(\d{4})/i);
  const startYear = period ? +period[3] : new Date().getFullYear();
  const startMonth = period ? +period[2] : 1;
  const holderIdx = allText.findIndex((l) => /No\.\s*de\s*Cliente/i.test(l));
  const holder = holderIdx >= 0 && /^[A-ZÁÉÍÓÚÑ ]{8,}$/.test(allText[holderIdx + 1] ?? "") ? allText[holderIdx + 1].trim() : null;
  const account = allText.join("\n").match(/No\.\s*de\s*Cuenta\s+(\d{6,})/i);
  const titleIdx = allText.findIndex((l) => /^Estado\s+de\s+Cuenta$/i.test(l.trim()));
  const product = (titleIdx >= 0 ? allText[titleIdx + 1] : null)?.trim() || "BBVA";

  const toYmd = (code: string): string | null => {
    const m = code.match(DATE);
    const month = m ? PDF_MONTH_CODES[m[2]] : undefined;
    if (!m || !month) return null;
    const year = month < startMonth ? startYear + 1 : startYear; // el periodo cruza de diciembre a enero
    return `${year}-${pad(month)}-${m[1]}`;
  };

  // ── Movimientos ──────────────────────────────────────────────────────────
  const rows: Raw[] = [];
  let current: Raw | null = null;
  let done = false;
  let columns: Columns | null = null;
  for (const page of pages) {
    if (done) break;
    const lines = toLines(page);
    const found = findColumns(lines);
    // Algunas cuentas repiten el encabezado de columnas en cada página y otras solo en la primera:
    // sin encabezado, la página continúa la tabla anterior con las mismas columnas.
    if (found) columns = found.columns;
    else if (!columns) continue; // páginas sin tabla (resumen, glosario, datos fiscales)
    const cols = columns!;
    for (const line of lines.slice(found ? found.headerIndex + 1 : 0)) {
      const text = lineText(line);
      if (/Total\s+de\s+Movimientos|TOTAL\s+IMPORTE/i.test(text)) {
        done = true;
        break;
      }
      if (PAGE_NOISE.test(text)) continue; // cabecera y pie de página

      const dates = line.filter((i) => DATE.test(i.text) && i.x0 < cols.descFrom);
      if (dates.length >= 1) {
        current = { date: dates[0].text, description: [], details: [], cargo: null, abono: null, saldoOp: null, saldoLiq: null };
        rows.push(current);
      }
      if (!current) continue;
      for (const it of line) {
        if (dates.includes(it)) continue;
        if (MONEY.test(it.text)) {
          const v = toNumber(it.text);
          if (it.x1 <= cols.cargoMax) current.cargo = (current.cargo ?? 0) + v;
          else if (it.x1 <= cols.abonoMax) current.abono = (current.abono ?? 0) + v;
          else if (it.x1 <= cols.saldoOpMax) current.saldoOp = v;
          else current.saldoLiq = v;
        } else if (dates.length >= 1) {
          current.description.push(it.text);
        }
      }
      if (dates.length === 0) {
        const detail = cleanDetail(line.filter((i) => !MONEY.test(i.text)).map((i) => i.text).join(" "), holder);
        if (detail) current.details.push(detail);
      }
    }
  }

  // ── Renglones del banco ─────────────────────────────────────────────────
  const lines: BankLine[] = [];
  const balances: { index: number; saldoOp: number }[] = [];
  let n = 0;
  for (const r of rows) {
    if (r.cargo === null && r.abono === null) continue; // "APERTURA DE CUENTA" y similares
    const date = toYmd(r.date);
    if (!date) {
      warnings.push(`No se entendió la fecha "${r.date}".`);
      continue;
    }
    n++;
    const amount = round2((r.abono ?? 0) - (r.cargo ?? 0));
    // El PDF pega la palabra y el banco ("RECIBIDOINBURSA"): se separan.
    const head = r.description.join(" ").trim().replace(/(RECIBIDO|ENVIADO)(?=[A-Z])/, "$1 ");
    const description = joinDetails(head, r.details);
    lines.push({ id: `B${n}`, date, description, amount, balance: r.saldoLiq ?? r.saldoOp });
    if (r.saldoOp !== null) balances.push({ index: lines.length - 1, saldoOp: r.saldoOp });
  }

  // ── Comprobaciones contra lo que el banco imprime ───────────────────────
  const checks: StatementCheck[] = [];
  const text = allText.join("\n");
  const abonosTotal = text.match(/TOTAL\s+IMPORTE\s+ABONOS\s+([\d,]+\.\d{2})\s+TOTAL\s+MOVIMIENTOS\s+ABONOS\s+(\d+)/i);
  const cargosTotal = text.match(/TOTAL\s+IMPORTE\s+CARGOS\s+([\d,]+\.\d{2})\s+TOTAL\s+MOVIMIENTOS\s+CARGOS\s+(\d+)/i);
  const credits = lines.filter((l) => l.amount > 0);
  const debits = lines.filter((l) => l.amount < 0);
  const sum = (xs: BankLine[]) => round2(xs.reduce((s, l) => s + Math.abs(l.amount), 0));
  const compare = (label: string, parsed: RegExpMatchArray | null, got: BankLine[]) => {
    if (!parsed) return warnings.push(`No se encontró el total de ${label.toLowerCase()} del banco para comprobar la lectura.`);
    const wantAmount = toNumber(parsed[1]);
    const wantCount = +parsed[2];
    const ok = Math.abs(sum(got) - wantAmount) < PDF_TOTAL_TOLERANCE && got.length === wantCount;
    checks.push({ label, ok, detail: `${got.length} de ${wantCount} movimientos · $${sum(got).toLocaleString("es-MX", { minimumFractionDigits: 2 })} de $${wantAmount.toLocaleString("es-MX", { minimumFractionDigits: 2 })}` });
  };
  compare("Abonos", abonosTotal, credits);
  compare("Cargos", cargosTotal, debits);

  // Saldo corrido: cada saldo de OPERACIÓN impreso debe coincidir con la suma acumulada desde el saldo anterior.
  const opening = text.match(/Saldo\s+Anterior\s+(-?[\d,]+\.\d{2})/i);
  if (opening && balances.length > 0) {
    let running = toNumber(opening[1]);
    let idx = 0;
    const bad: string[] = [];
    for (const b of balances) {
      while (idx <= b.index) running = round2(running + lines[idx++].amount);
      if (Math.abs(running - b.saldoOp) > PDF_TOTAL_TOLERANCE) bad.push(`${lines[b.index].date}: calculado ${running.toFixed(2)} y el banco dice ${b.saldoOp.toFixed(2)}`);
    }
    checks.push({ label: "Saldos corridos", ok: bad.length === 0, detail: bad.length ? bad.join("; ") : `${balances.length} saldos del banco coinciden con la suma de los movimientos` });
  } else {
    warnings.push("No se pudo comprobar el saldo corrido.");
  }

  // Saldo final: saldo anterior + todos los movimientos debe dar el saldo final que imprime el banco.
  const closing = text.match(/Saldo\s+Final\s*(?:\(\+\))?\s+(-?[\d,]+\.\d{2})/i);
  const openingBalance = opening ? toNumber(opening[1]) : null;
  const closingBalance = closing ? toNumber(closing[1]) : null;
  if (openingBalance !== null && closingBalance !== null) {
    const computed = round2(lines.reduce((s, l) => s + l.amount, openingBalance));
    const ok = Math.abs(computed - closingBalance) < PDF_TOTAL_TOLERANCE;
    const money = (n: number) => n.toLocaleString("es-MX", { minimumFractionDigits: 2 });
    checks.push({ label: "Saldo final", ok, detail: ok ? `$${money(openingBalance)} + movimientos = $${money(closingBalance)}` : `calculado $${money(computed)} y el banco dice $${money(closingBalance)}` });
  } else {
    warnings.push("No se pudo comprobar el saldo final.");
  }

  const dates = lines.map((l) => l.date).sort();
  return {
    bank: "BBVA",
    product,
    accountId: account ? account[1] : null,
    holder,
    openingBalance,
    closingBalance,
    accountLast4: account ? account[1].slice(-4) : null,
    period: period ? { from: `${period[3]}-${period[2]}-${period[1]}`, to: `${period[6]}-${period[5]}-${period[4]}` } : dates.length ? { from: dates[0], to: dates[dates.length - 1] } : null,
    lines,
    checks,
    warnings,
  };
}
