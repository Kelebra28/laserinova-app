"use client";

import { useState } from "react";
import { X, Loader2, Save } from "lucide-react";
import { updateTransaction } from "@/app/dashboard/finance/actions";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from "@/app/dashboard/finance/constants";

const INCOME_TYPES = ["INGRESO", "ANTICIPO", "LIQUIDACION"];
const EXPENSE_TYPES = ["GASTO_OPERATIVO", "GASTO_PROYECTO"];

type Transaction = {
  id: string;
  type: string;
  category: string;
  amount: number;
  taxAmount: number;
  description: string;
  notes?: string | null;
  date: Date;
  paymentMethod?: string | null;
  provider?: string | null;
  quoteId?: string | null;
  clientId?: string | null;
};

interface TransactionEditModalProps {
  transaction: Transaction;
  quotes?: { id: string; folio: string; project: string }[];
  clients?: { id: string; name: string; company?: string | null }[];
  onClose: () => void;
}

export default function TransactionEditModal({ transaction, quotes = [], clients = [], onClose }: TransactionEditModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [applyIVA, setApplyIVA]   = useState(transaction.taxAmount > 0);
  const [amount, setAmount]       = useState(transaction.amount.toString());

  const isExpense = EXPENSE_TYPES.includes(transaction.type);
  const isProject = transaction.type === "GASTO_PROYECTO";
  const categories = isExpense ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const ivaAmount  = applyIVA ? (parseFloat(amount) || 0) * 0.16 : 0;

  const dateStr = new Date(transaction.date).toISOString().split("T")[0];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      formData.set("id", transaction.id);
      formData.set("taxAmount", ivaAmount.toString());
      await updateTransaction(formData);
      onClose();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gray-900 p-6 flex justify-between items-start">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Editando movimiento</p>
            <h3 className="text-sm font-black uppercase tracking-widest text-white line-clamp-1">{transaction.description}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/60 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <input type="hidden" name="type" value={transaction.type} />

          {/* Descripción */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Descripción *</label>
            <input
              name="description"
              type="text"
              required
              defaultValue={transaction.description}
              className="w-full text-xs font-bold p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-gray-900 transition-all"
            />
          </div>

          {/* Monto + Fecha */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Monto ($) *</label>
              <input
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full text-xs font-black p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-gray-900 transition-all font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Fecha *</label>
              <input
                name="date"
                type="date"
                required
                defaultValue={dateStr}
                className="w-full text-xs font-bold p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-gray-900 transition-all"
              />
            </div>
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Categoría *</label>
            <select
              name="category"
              required
              defaultValue={transaction.category}
              className="w-full text-xs font-bold p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-gray-900 transition-all appearance-none cursor-pointer"
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* IVA Toggle */}
          <div
            onClick={() => setApplyIVA(!applyIVA)}
            className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${
              applyIVA ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-100"
            }`}
          >
            <div>
              <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest">
                {isExpense ? "¿Tiene IVA acreditable?" : "¿Incluye IVA?"}
              </p>
              {applyIVA && amount && (
                <p className="text-[10px] font-bold text-amber-600 mt-0.5">
                  IVA: ${ivaAmount.toFixed(2)}
                </p>
              )}
            </div>
            <div className={`w-12 h-6 rounded-full transition-all relative ${applyIVA ? "bg-amber-500" : "bg-gray-200"}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${applyIVA ? "left-7" : "left-1"}`} />
            </div>
          </div>

          {/* Proyecto (si aplica) */}
          {isProject && (
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Proyecto</label>
              <select
                name="quoteId"
                defaultValue={transaction.quoteId || ""}
                className="w-full text-xs font-bold p-3 bg-amber-50 border border-amber-100 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 transition-all appearance-none cursor-pointer"
              >
                <option value="">Sin proyecto</option>
                {quotes.map(q => (
                  <option key={q.id} value={q.id}>{q.folio} — {q.project}</option>
                ))}
              </select>
            </div>
          )}

          {/* Cliente (ingresos) */}
          {!isExpense && (
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Cliente</label>
              <select
                name="clientId"
                defaultValue={transaction.clientId || ""}
                className="w-full text-xs font-bold p-3 bg-emerald-50 border border-emerald-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-400 transition-all appearance-none cursor-pointer"
              >
                <option value="">Sin cliente</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ""}</option>
                ))}
              </select>
            </div>
          )}

          {/* Método + Proveedor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Método</label>
              <select
                name="paymentMethod"
                defaultValue={transaction.paymentMethod || ""}
                className="w-full text-xs font-bold p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-gray-900 transition-all appearance-none cursor-pointer"
              >
                <option value="">Seleccionar...</option>
                {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Proveedor</label>
              <input
                name="provider"
                type="text"
                defaultValue={transaction.provider || ""}
                placeholder="Opcional"
                className="w-full text-xs font-bold p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-gray-900 transition-all"
              />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Notas</label>
            <textarea
              name="notes"
              rows={2}
              defaultValue={transaction.notes || ""}
              className="w-full text-xs font-bold p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-gray-900 transition-all resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-xl border-2 border-gray-100 text-gray-400 text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-900 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black transition-all active:scale-95 shadow-xl disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isLoading ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
