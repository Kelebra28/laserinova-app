import type { ReactNode } from "react";

type Props = { title: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string };

/** Tarjeta base del dashboard: título, subtítulo opcional y una acción a la derecha. */
export default function Panel({ title, subtitle, action, children, className = "" }: Props) {
  return (
    <section className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
