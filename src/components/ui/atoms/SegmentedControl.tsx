type Option<T extends string> = { id: T; label: string };
type Props<T extends string> = { value: T; onChange: (v: T) => void; options: readonly Option<T>[]; size?: "sm" | "md"; label?: string };

const SIZES = {
  sm: { track: "rounded-lg p-0.5", item: "px-3 py-1 text-xs rounded-md" },
  md: { track: "rounded-xl p-1", item: "px-3.5 py-1.5 text-xs rounded-lg" },
};

/** Selector de una opción entre pocas (periodo, día/semana/mes…). */
export default function SegmentedControl<T extends string>({ value, onChange, options, size = "sm", label }: Props<T>) {
  const s = SIZES[size];
  return (
    <div className={`inline-flex bg-gray-100 ${s.track}`} role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          role="tab"
          aria-selected={value === o.id}
          onClick={() => onChange(o.id)}
          className={`${s.item} font-bold transition-colors ${value === o.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
