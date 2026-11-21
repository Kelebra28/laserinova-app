"use client";

import { useMemo, useState, useTransition } from "react";
import { reconcileBankStatement, registerBankPayment } from "@/server/actions/reconciliation.actions";
import { uploadBankStatementPdf } from "@/server/actions/bank-statements.actions";
import { RECON_MAX_FILE_BYTES } from "@/constants/reconciliation.constants";
import { detectMapping, normalizeLines, parseBankCsv } from "@/lib/bank-csv";
import type { ParsedStatement } from "@/types/bank-statement";
import type { LoadedStatement } from "@/types/bank-overview";
import type { BankLine, ColumnMapping, NormalizeReport, ParsedCsv, ReconResult } from "@/types/reconciliation";

/** Los CSV de los bancos a veces vienen en Windows-1252: si el texto sale con caracteres rotos, se relee. */
async function readCsvFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const utf8 = new TextDecoder("utf-8").decode(buffer);
  return utf8.includes("�") ? new TextDecoder("windows-1252").decode(buffer) : utf8;
}

/**
 * Estado de la conciliación: archivo leído, columnas elegidas, resultado.
 * Todo vive en el navegador; al servidor solo se manda la lista de renglones para compararla.
 */
export function useReconciliation() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  /** Estado de cuenta leído de un PDF (ya viene con sus columnas resueltas). */
  const [pdf, setPdf] = useState<(ParsedStatement & { storedId?: string }) | null>(null);
  const [reading, setReading] = useState(false);
  const [headerRow, setHeaderRowState] = useState(0);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [result, setResult] = useState<ReconResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, startTransition] = useTransition();

  const report = useMemo<NormalizeReport | null>(() => {
    if (pdf) return { lines: pdf.lines, skipped: 0, warnings: pdf.warnings };
    return parsed ? normalizeLines(parsed.rows, headerRow, mapping) : null;
  }, [pdf, parsed, headerRow, mapping]);
  const headers = parsed ? parsed.rows[headerRow] ?? [] : [];

  const loadFile = async (file: File) => {
    setError(null);
    setResult(null);
    const isPdf = /\.pdf$/i.test(file.name) || file.type === "application/pdf";
    if (isPdf) {
      setReading(true);
      try {
        const body = new FormData();
        body.append("file", file);
        // Se lee y se guarda (un mes de una cuenta ya guardado no se duplica): así alimenta las gráficas del panorama
        const res = await uploadBankStatementPdf(body);
        if (!res.success) return setError(res.error);
        setFileName(file.name);
        setParsed(null);
        setPdf(res.data.statement);
      } catch {
        setError("No se pudo leer el PDF. Intenta de nuevo.");
      } finally {
        setReading(false);
      }
      return;
    }
    if (file.size > RECON_MAX_FILE_BYTES) return setError("El archivo es demasiado grande (máximo 2 MB). Exporta un solo mes.");
    try {
      const csv = parseBankCsv(await readCsvFile(file));
      if (csv.rows.length === 0) return setError("El archivo está vacío.");
      setFileName(file.name);
      setPdf(null);
      setParsed(csv);
      setHeaderRowState(Math.max(csv.headerRow, 0));
      setMapping(csv.mapping);
    } catch {
      setError("No se pudo leer el archivo. Verifica que sea un CSV o un PDF.");
    }
  };

  const setHeaderRow = (row: number) => {
    if (!parsed) return;
    setHeaderRowState(row);
    setMapping(detectMapping(parsed.rows[row] ?? []));
    setResult(null);
  };

  const setField = (field: keyof ColumnMapping, index: number | undefined) => {
    setMapping((m) => ({ ...m, [field]: index }));
    setResult(null);
  };

  const run = () => {
    if (!report || report.lines.length === 0) return;
    setError(null);
    startTransition(async () => {
      const res = await reconcileBankStatement(report.lines, pdf?.period ?? undefined);
      if (res.success) setResult(res.data);
      else setError(res.error);
    });
  };

  /** Registra un depósito como cobro (solo después de que la persona confirmó) y vuelve a conciliar. */
  const register = async (line: BankLine, allocations: { quoteId: string; amount: number }[]) => {
    const fingerprint = result?.fingerprints[line.id];
    if (!fingerprint || !report) return { success: false as const, error: "Falta la marca del renglón. Vuelve a conciliar." };
    const res = await registerBankPayment({ line, fingerprint, allocations, movementId: pdf?.storedId ? line.id : undefined });
    if (res.success) {
      const again = await reconcileBankStatement(report.lines, pdf?.period ?? undefined);
      if (again.success) setResult(again.data);
    }
    return res;
  };

  /** Usa un estado ya guardado (sin volver a subir el PDF). */
  const useStored = (s: LoadedStatement) => {
    setError(null);
    setResult(null);
    setParsed(null);
    setFileName(s.fileName);
    setPdf(s);
  };

  const reset = () => {
    setFileName(null);
    setParsed(null);
    setPdf(null);
    setMapping({});
    setResult(null);
    setError(null);
  };

  return { fileName, parsed, pdf, reading, headerRow, headers, mapping, report, result, error, running, loadFile, useStored, setHeaderRow, setField, run, register, reset };
}
