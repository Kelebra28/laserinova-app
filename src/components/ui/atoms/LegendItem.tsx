type Props = { color: string; label: string; value?: string };

/** Punto de color + etiqueta (+ valor) para leyendas de gráficas. */
export default function LegendItem({ color, label, value }: Props) {
  return (
    <span className="inline-flex items-center gap-2 text-gray-500">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
      {value && <span className="font-bold text-gray-900 tabular-nums">{value}</span>}
    </span>
  );
}
