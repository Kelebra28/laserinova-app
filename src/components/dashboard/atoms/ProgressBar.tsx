type Props = { value: number; color?: string; className?: string; height?: string };

/** Barra de avance (0-100). `color` puede ser una clase de Tailwind o un hex. */
export default function ProgressBar({ value, color = "bg-gray-900", height = "h-1.5", className = "" }: Props) {
  const isHex = color.startsWith("#");
  return (
    <div className={`${height} rounded-full bg-gray-100 overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full ${isHex ? "" : color}`}
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%`, ...(isHex ? { backgroundColor: color } : {}) }}
      />
    </div>
  );
}
