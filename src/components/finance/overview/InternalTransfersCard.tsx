import Panel from "@/components/ui/atoms/Panel";
import { formatMoney, formatShortDate } from "@/constants/formatters.constants";
import type { InternalTransfer } from "@/types/bank-overview";

type Props = { transfers: InternalTransfer[]; excluded: boolean };

const REASON = { pair: "La otra punta está en otro estado subido", holder: "El concepto menciona tu nombre" } as const;

/** Las transferencias entre cuentas propias que se detectaron, para que se vea qué se excluye (y por qué). */
export default function InternalTransfersCard({ transfers, excluded }: Props) {
  if (transfers.length === 0) return null;
  return (
    <Panel title="Transferencias entre tus cuentas" subtitle={excluded ? "No cuentan como ingreso ni egreso, para no contar el dinero dos veces" : "Se detectaron, pero en esta vista sí cuentan en los totales"}>
      <ul className="divide-y divide-gray-100">
        {transfers.map((t) => (
          <li key={t.id} className="flex items-start justify-between gap-4 py-2.5">
            <div className="min-w-0">
              <p className="text-sm text-gray-900">
                <span className="tabular-nums text-gray-500 mr-2">{formatShortDate(t.date)}</span>
                <span className="text-gray-400 mr-2">…{t.last4}</span>
                {t.description}
              </p>
              <p className="text-[11px] text-gray-400">
                {REASON[t.reason]}
                {t.counterpart ? ` · ${t.counterpart}` : ""}
              </p>
            </div>
            <span className={`shrink-0 text-sm font-bold tabular-nums ${t.amount >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatMoney(t.amount, 2)}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
