import { ArrowDownRight, ArrowUpRight } from "lucide-react";

type Props = { value: number | null; label: string; inverse?: boolean };

/** Cambio porcentual con flecha. `inverse`: cuando bajar es lo bueno (gastos, tiempo de respuesta). */
export default function TrendBadge({ value, label, inverse = false }: Props) {
  if (value === null) return <span className="text-xs text-gray-400">Sin periodo previo</span>;
  const up = value >= 0;
  const good = inverse ? !up : up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold ${good ? "text-emerald-600" : "text-red-600"}`}>
      <Icon className="h-3.5 w-3.5" />
      {Math.abs(value).toFixed(0)}%
      <span className="font-medium text-gray-400">{label}</span>
    </span>
  );
}
