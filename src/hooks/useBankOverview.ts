"use client";

import { useMemo, useState } from "react";
import { deleteBankStatement, ignoreBankMovements, registerBankExpenses, uploadBankStatementPdf } from "@/server/actions/bank-statements.actions";
import { buildOverview } from "@/lib/bank-overview";
import { OVERVIEW_ALL_ACCOUNTS, OVERVIEW_DEFAULT_MODE, OVERVIEW_MAX_FILES, type OverviewMode } from "@/constants/bank-overview.constants";
import type { LoadedStatement } from "@/types/bank-overview";
import type { MovementState } from "@/constants/bank-storage.constants";

/**
 * Estado del panorama bancario. Los estados vienen de la base de datos (ya guardados) y cada PDF nuevo se
 * lee y se guarda en el servidor, de uno en uno (así no se acumula el tamaño de varias subidas en una petición).
 */
export function useBankOverview(initial: LoadedStatement[]) {
  const [statements, setStatements] = useState<LoadedStatement[]>(initial);
  const [account, setAccount] = useState<string>(OVERVIEW_ALL_ACCOUNTS);
  const [mode, setMode] = useState<OverviewMode>(OVERVIEW_DEFAULT_MODE);
  const [excludeTransfers, setExcludeTransfers] = useState(true);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [notices, setNotices] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const overview = useMemo(() => buildOverview(statements, { account, mode, excludeTransfers }), [statements, account, mode, excludeTransfers]);

  const addFiles = async (files: File[]) => {
    const pdfs = files.filter((f) => /\.pdf$/i.test(f.name) || f.type === "application/pdf");
    const problems = files.filter((f) => !pdfs.includes(f)).map((f) => `${f.name}: no es un PDF.`);
    const room = Math.max(OVERVIEW_MAX_FILES - statements.length, 0);
    if (pdfs.length > room) problems.push(`Solo caben ${OVERVIEW_MAX_FILES} estados; se ignoraron ${pdfs.length - room}.`);
    const batch = pdfs.slice(0, room);
    setErrors(problems);
    setNotices([]);
    setProgress({ done: 0, total: batch.length });
    for (let i = 0; i < batch.length; i++) {
      try {
        const body = new FormData();
        body.append("file", batch[i]);
        const res = await uploadBankStatementPdf(body);
        if (res.success) {
          const { statement, status } = res.data;
          if (status === "exists") setNotices((prev) => [...prev, `${batch[i].name}: ese mes de esa cuenta ya estaba guardado, no se duplicó.`]);
          else setStatements((prev) => [...prev.filter((s) => s.storedId !== statement.storedId), statement]);
        } else setErrors((prev) => [...prev, `${batch[i].name}: ${res.error}`]);
      } catch {
        setErrors((prev) => [...prev, `${batch[i].name}: no se pudo leer ni guardar.`]);
      }
      setProgress({ done: i + 1, total: batch.length });
    }
    setProgress(null);
  };

  const removeStatement = async (index: number) => {
    const target = statements[index];
    if (!target?.storedId) return;
    const res = await deleteBankStatement(target.storedId);
    if (res.success) setStatements((prev) => prev.filter((s) => s.storedId !== target.storedId));
    else setErrors((prev) => [...prev, res.error]);
  };

  const setStates = (ids: string[], state: MovementState) => {
    const set = new Set(ids);
    setStatements((prev) => prev.map((s) => ({ ...s, lines: s.lines.map((l) => (set.has(l.id) ? { ...l, state } : l)) })));
  };

  /** Registra como gasto en Finanzas los cargos elegidos. */
  const registerExpenses = async (ids: string[]) => {
    setBusy(true);
    const res = await registerBankExpenses(ids);
    setBusy(false);
    if (!res.success) return setErrors((prev) => [...prev, res.error]);
    setStates(ids, "GASTO");
    setNotices([`Se registraron ${res.data.created} gastos en Finanzas${res.data.skipped ? ` (${res.data.skipped} ya estaban o no aplicaban)` : ""}.`]);
  };

  const ignoreCharges = async (ids: string[], ignored: boolean) => {
    setBusy(true);
    const res = await ignoreBankMovements(ids, ignored);
    setBusy(false);
    if (!res.success) return setErrors((prev) => [...prev, res.error]);
    setStates(ids, ignored ? "IGNORADO" : "PENDIENTE");
  };

  // Si la cuenta elegida ya no existe (se quitó su último estado), se vuelve a "todas".
  const accountValid = account === OVERVIEW_ALL_ACCOUNTS || overview.accounts.some((a) => a.id === account);
  return { statements, overview, account: accountValid ? account : OVERVIEW_ALL_ACCOUNTS, setAccount, mode, setMode, excludeTransfers, setExcludeTransfers, progress, errors, notices, busy, addFiles, removeStatement, registerExpenses, ignoreCharges };
}
