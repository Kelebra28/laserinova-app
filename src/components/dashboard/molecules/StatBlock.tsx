import type { LucideIcon } from "lucide-react";

type Props = { icon: LucideIcon; label: string; value: string };

/** Cifra mediana con ícono y etiqueta chica. */
export default function StatBlock({ icon: Icon, label, value }: Props) {
  return (
    <div>
      <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      <p className="text-xl font-black text-gray-900 tabular-nums mt-0.5">{value}</p>
    </div>
  );
}
