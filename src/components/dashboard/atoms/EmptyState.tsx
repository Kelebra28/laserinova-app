import { CheckCircle2 } from "lucide-react";

/** Texto centrado cuando no hay datos. */
export function EmptyState({ text }: { text: string }) {
  return <div className="flex-1 flex items-center justify-center text-center text-sm text-gray-400 py-10">{text}</div>;
}

/** Estado positivo ("todo al día"): ícono verde, título y texto opcional. */
export function AllClear({ title, text }: { title: string; text?: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center py-8 gap-2">
      <CheckCircle2 className="h-8 w-8 text-emerald-500" />
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      {text && <p className="text-xs text-gray-500">{text}</p>}
    </div>
  );
}
