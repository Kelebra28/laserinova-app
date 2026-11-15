import type { ReactNode } from "react";

type Props = {
  monthLabel: string;
  /** Selector de mes y año. */
  filter: ReactNode;
  /** Botones de acción (historial, nuevo movimiento). */
  actions: ReactNode;
};

export default function FinanceHeader({ monthLabel, filter, actions }: Props) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">
          Estado <span className="text-red-600">financiero</span>
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          <span className="capitalize">{monthLabel}</span> · cada número tiene origen trazable
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {filter}
        {actions}
      </div>
    </div>
  );
}
