import { AlertTriangle } from "lucide-react";
import type { ContinuityIssue } from "@/types/bank-overview";

/** Avisos que importan: falta un estado, saldos que no enlazan, estados repetidos o que no cuadran. */
export default function OverviewIssues({ issues, errors }: { issues: ContinuityIssue[]; errors: string[] }) {
  const items = [...errors, ...issues.map((i) => i.message)];
  if (items.length === 0) return null;
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <p className="flex items-center gap-2 text-sm font-bold text-amber-800">
        <AlertTriangle className="h-4 w-4" /> Revisa esto
      </p>
      <ul className="mt-2 space-y-1 text-xs text-amber-800 list-disc pl-5">
        {items.map((m, i) => (
          <li key={i}>{m}</li>
        ))}
      </ul>
    </div>
  );
}
