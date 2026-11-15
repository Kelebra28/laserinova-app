"use client";

import { useMemo, useState } from "react";
import { parseBankStatementPdf } from "@/server/actions/reconciliation.actions";
import { buildOverview } from "@/lib/bank-overview";
import { OVERVIEW_ALL_ACCOUNTS, OVERVIEW_DEFAULT_MODE, OVERVIEW_MAX_FILES, type OverviewMode } from "@/constants/bank-overview.constants";
import type { LoadedStatement } from "@/types/bank-overview";

/**
 * Estado del panorama bancario: los estados ya leídos, la cuenta y la agrupación elegidas.
 * Todo vive en memoria; nada se guarda. Cada PDF se manda por separado al servidor para leerlo
 * (así no se acumula el tamaño de varias subidas en una sola petición).
 */
export function useBankOverview() {
  const [statements, setStatements] = useState<LoadedStatement[]>([]);
  const [account, setAccount] = useState<string>(OVERVIEW_ALL_ACCOUNTS);
  const [mode, setMode] = useState<OverviewMode>(OVERVIEW_DEFAULT_MODE);
  const [excludeTransfers, setExcludeTransfers] = useState(true);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const overview = useMemo(() => buildOverview(statements, { account, mode, excludeTransfers }), [statements, account, mode, excludeTransfers]);

  const addFiles = async (files: File[]) => {
    const pdfs = files.filter((f) => /\.pdf$/i.test(f.name) || f.type === "application/pdf");
    const problems = files.filter((f) => !pdfs.includes(f)).map((f) => `${f.name}: no es un PDF.`);
    const room = Math.max(OVERVIEW_MAX_FILES - statements.length, 0);
    if (pdfs.length > room) problems.push(`Solo caben ${OVERVIEW_MAX_FILES} estados a la vez; se ignoraron ${pdfs.length - room}.`);
    const batch = pdfs.slice(0, room);
    setErrors(problems);
    setProgress({ done: 0, total: batch.length });
    for (let i = 0; i < batch.length; i++) {
      try {
        const body = new FormData();
        body.append("file", batch[i]);
        const res = await parseBankStatementPdf(body);
        if (res.success) setStatements((prev) => [...prev, { ...res.data, fileName: batch[i].name }]);
        else setErrors((prev) => [...prev, `${batch[i].name}: ${res.error}`]);
      } catch {
        setErrors((prev) => [...prev, `${batch[i].name}: no se pudo leer.`]);
      }
      setProgress({ done: i + 1, total: batch.length });
    }
    setProgress(null);
  };

  const removeStatement = (index: number) => setStatements((prev) => prev.filter((_, i) => i !== index));
  const clear = () => {
    setStatements([]);
    setErrors([]);
    setAccount(OVERVIEW_ALL_ACCOUNTS);
  };

  // Si la cuenta elegida ya no existe (se quitó su último estado), se vuelve a "todas".
  const accountValid = account === OVERVIEW_ALL_ACCOUNTS || overview.accounts.some((a) => a.id === account);
  return { statements, overview, account: accountValid ? account : OVERVIEW_ALL_ACCOUNTS, setAccount, mode, setMode, excludeTransfers, setExcludeTransfers, progress, errors, addFiles, removeStatement, clear };
}
