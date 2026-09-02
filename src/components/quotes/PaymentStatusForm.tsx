"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";
import SubmitButton from "@/components/ui/SubmitButton";
import Select from "@/components/ui/Select";
import { updateQuotePayment } from "@/server/actions/quote.actions";

interface PaymentStatusFormProps {
  quoteId: string;
  currentStatus: string;
  currentAmount: number;
  totalAmount: number;
}

import { PAYMENT_STATUS_LABELS } from "@/lib/constants";

export default function PaymentStatusForm({ quoteId, currentStatus, currentAmount, totalAmount }: PaymentStatusFormProps) {
  const [status, setStatus] = useState(currentStatus || "PENDING");
  const [amount, setAmount] = useState(currentAmount);

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    if (newStatus === "REFUNDED") {
      setAmount(0);
    } else if (newStatus === "PAID" && amount === 0) {
      setAmount(totalAmount);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-2 mb-6 border-b border-gray-50 pb-4">
        <div className="p-2 bg-emerald-50 rounded-lg">
          <CreditCard className="h-4 w-4 text-emerald-600" />
        </div>
        <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Control de Pagos</h3>
      </div>
      <form action={updateQuotePayment} className="space-y-5">
        <input type="hidden" name="quoteId" value={quoteId} />
        <input type="hidden" name="paymentStatus" value={status} />
        <div>
          <Select
            label="Estatus de Cobro"
            options={Object.entries(PAYMENT_STATUS_LABELS).map(([key, label]) => ({ value: key, label }))}
            value={status}
            onChange={handleStatusChange}
          />
        </div>
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Monto Recibido ($)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">$</span>
            <input
              type="number"
              step="0.01"
              name="realAmountCollected"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full text-sm font-black pl-8 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-red-500 font-mono"
            />
          </div>
        </div>
        <SubmitButton
          variant="primary"
          loadingText="..."
          className="w-full py-3 text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg"
        >
          Actualizar Caja
        </SubmitButton>
      </form>
      
      {amount < totalAmount && status !== "REFUNDED" && (
        <div className="mt-6 pt-4 border-t border-gray-50 space-y-1 text-center">
          <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest block">Restante por cobrar</span>
          <span className="text-xl font-black text-red-600 font-mono">
            ${(totalAmount - amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      )}

      {status === "REFUNDED" && (
        <div className="mt-6 pt-4 border-t border-gray-50 text-center">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Proyecto Reembolsado</span>
          <span className="text-xs font-bold text-gray-400">El ingreso se ha anulado</span>
        </div>
      )}
    </div>
  );
}
