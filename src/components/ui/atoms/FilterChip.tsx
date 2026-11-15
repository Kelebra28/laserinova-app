import type { ReactNode } from "react";

type Tone = "dark" | "danger" | "info";
type Props = { active: boolean; onClick: () => void; count?: number; tone?: Tone; leading?: ReactNode; children: ReactNode };

const ACTIVE: Record<Tone, string> = {
  dark: "bg-gray-900 border-gray-900 text-white",
  danger: "bg-red-50 border-red-200 text-red-700",
  info: "bg-gray-100 border-gray-300 text-gray-800",
};

/** Botón-etiqueta con contador para filtrar listas. */
export default function FilterChip({ active, onClick, count, tone = "dark", leading, children }: Props) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold border transition-colors ${
        active ? ACTIVE[tone] : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
      }`}
    >
      {leading}
      {children}
      {count !== undefined &&
        (tone === "dark" ? (
          <span className={`tabular-nums ${active ? "opacity-70" : "text-gray-400"}`}>{count}</span>
        ) : (
          <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${count > 0 ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-400"}`}>{count}</span>
        ))}
    </button>
  );
}
