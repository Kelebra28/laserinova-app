type Props = { label: string; value: string; sub: string };

/** Dato clave resumido: etiqueta, valor y una línea de contexto. */
export default function InsightTile({ label, value, sub }: Props) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
      <p className="text-base font-black text-gray-900 leading-tight mt-0.5">{value}</p>
      <p className="text-[11px] text-gray-500">{sub}</p>
    </div>
  );
}
