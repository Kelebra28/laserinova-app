import type { ReactNode } from "react";

type Props = { children: ReactNode; accent: string; action?: ReactNode };

/** Encabezado de sección con barra de color a la izquierda. */
export default function SectionTitle({ children, accent, action }: Props) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-5 w-1 rounded-full ${accent}`} />
      <h2 className="text-lg font-black text-gray-900 tracking-tight">{children}</h2>
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}
