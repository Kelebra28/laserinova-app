/** Píldora con un conteo ("46 registros"). */
export default function CountBadge({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{children}</span>;
}
