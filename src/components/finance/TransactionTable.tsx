"use client";

import { useState, useMemo } from "react";
import { 
  Trash2, Pencil, Filter, ChevronDown, Search,
  TrendingUp, TrendingDown, Briefcase, Receipt, 
  SlidersHorizontal, X, AlertTriangle, Loader2
} from "lucide-react";
import { softDeleteTransaction } from "@/app/dashboard/finance/actions";
import TransactionEditModal from "./TransactionEditModal";
import { UserAvatar } from "@/components/ui/UserAvatar";

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
  status: string;
  isVirtual?: boolean;
  quote?: { folio: string; project: string } | null;
  client?: { name: string } | null;
  createdBy?: { name: string } | null;
};

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: any; bg: string }> = {
  GASTO_OPERATIVO: { label: "Gasto Op.",    color: "text-red-700",     bg: "bg-red-50 border-red-100",     icon: TrendingDown },
  GASTO_PROYECTO:  { label: "Gasto Proy.",  color: "text-orange-700",  bg: "bg-orange-50 border-orange-100", icon: Briefcase    },
  INGRESO:         { label: "Ingreso",      color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-100", icon: TrendingUp  },
  ANTICIPO:        { label: "Anticipo",     color: "text-blue-700",    bg: "bg-blue-50 border-blue-100",    icon: TrendingUp   },
  LIQUIDACION:     { label: "Liquidación",  color: "text-teal-700",    bg: "bg-teal-50 border-teal-100",   icon: TrendingUp   },
  AJUSTE:          { label: "Ajuste",       color: "text-gray-600",    bg: "bg-gray-50 border-gray-200",   icon: Receipt      },
};

const INCOME_TYPES = ["INGRESO", "ANTICIPO", "LIQUIDACION"];

interface TransactionTableProps {
  transactions: Transaction[];
  quotes?: { id: string; folio: string; project: string }[];
  clients?: { id: string; name: string; company?: string | null }[];
}

export default function TransactionTable({ transactions, quotes = [], clients = [] }: TransactionTableProps) {
  const [search, setSearch]               = useState("");
  const [filterType, setFilterType]       = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [deletingId, setDeletingId]       = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);

  const categories = useMemo(() => {
    const cats = new Set(transactions.map(t => t.category));
    return Array.from(cats).sort();
  }, [transactions]);

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      const matchSearch = !search || 
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase()) ||
        t.provider?.toLowerCase().includes(search.toLowerCase()) ||
        t.quote?.folio.toLowerCase().includes(search.toLowerCase()) ||
        t.client?.name.toLowerCase().includes(search.toLowerCase());
      
      const matchType = 
        filterType === "all" ? true :
        filterType === "ALL_INCOME" ? INCOME_TYPES.includes(t.type) :
        filterType === "ALL_EXPENSE" ? (!INCOME_TYPES.includes(t.type) && t.type !== "AJUSTE") :
        t.type === filterType;

      const matchCategory = filterCategory === "all" || t.category === filterCategory;
      return matchSearch && matchType && matchCategory;
    });
  }, [transactions, search, filterType, filterCategory]);

  const totals = useMemo(() => {
    const income  = filtered.filter(t => INCOME_TYPES.includes(t.type)).reduce((s, t) => s + t.amount, 0);
    const expense = filtered.filter(t => !INCOME_TYPES.includes(t.type) && t.type !== "AJUSTE").reduce((s, t) => s + t.amount, 0);
    return { income, expense, net: income - expense };
  }, [filtered]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const formData = new FormData();
      formData.set("id", id);
      formData.set("reason", "Eliminado por usuario desde tabla de movimientos");
      await softDeleteTransaction(formData);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
          <p className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-1">Ingresos</p>
          <p className="text-lg font-black text-emerald-700">
            +${totals.income.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-center">
          <p className="text-[9px] font-black text-red-500 uppercase tracking-[0.2em] mb-1">Gastos</p>
          <p className="text-lg font-black text-red-700">
            -${totals.expense.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className={`rounded-2xl p-4 text-center border ${totals.net >= 0 ? "bg-gray-900 border-gray-800" : "bg-red-600 border-red-500"}`}>
          <p className="text-[9px] font-black text-white/50 uppercase tracking-[0.2em] mb-1">Neto filtrado</p>
          <p className={`text-lg font-black ${totals.net >= 0 ? "text-white" : "text-white"}`}>
            ${totals.net.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por descripción, categoría, proveedor..."
            className="w-full text-xs font-bold pl-9 pr-4 py-3 bg-white border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-gray-900 shadow-sm"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="text-[10px] font-black uppercase tracking-wide py-3 px-4 bg-white border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-gray-900 shadow-sm appearance-none cursor-pointer min-w-[160px]"
          >
            <option value="all">Todos los tipos</option>
            <option value="ALL_INCOME">Solo Ingresos (Verdes)</option>
            <option value="ALL_EXPENSE">Solo Gastos (Rojos)</option>
            <option disabled>──────────</option>
            <option value="GASTO_OPERATIVO">Gasto Operativo</option>
            <option value="GASTO_PROYECTO">Gasto Proyecto</option>
            <option value="INGRESO">Ingreso</option>
            <option value="ANTICIPO">Anticipo</option>
            <option value="LIQUIDACION">Liquidación</option>
            <option value="AJUSTE">Ajuste</option>
          </select>

          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="text-[10px] font-black uppercase tracking-wide py-3 px-4 bg-white border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-gray-900 shadow-sm appearance-none cursor-pointer min-w-[160px]"
          >
            <option value="all">Todas las categorías</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <SlidersHorizontal className="h-8 w-8 text-gray-200 mx-auto mb-3" />
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">
              {transactions.length === 0 ? "Sin movimientos registrados este mes" : "Sin resultados para ese filtro"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[600px] custom-scrollbar">
            <table className="min-w-full">
              <thead className="sticky top-0 bg-white z-10 shadow-sm">
                <tr className="border-b border-gray-50">
                  <th className="px-5 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-[0.15em]">Fecha</th>
                  <th className="px-5 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-[0.15em]">Tipo</th>
                  <th className="px-5 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-[0.15em]">Descripción</th>
                  <th className="px-5 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-[0.15em]">Proyecto</th>
                  <th className="px-5 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-[0.15em]">Registrado por</th>
                  <th className="px-5 py-4 text-right text-[9px] font-black text-gray-400 uppercase tracking-[0.15em]">Monto</th>
                  <th className="px-5 py-4 text-center text-[9px] font-black text-gray-400 uppercase tracking-[0.15em]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(t => {
                  const config = TYPE_CONFIG[t.type] || TYPE_CONFIG.AJUSTE;
                  const Icon = config.icon;
                  const isIncome = INCOME_TYPES.includes(t.type);
                  const isConfirming = confirmDeleteId === t.id;
                  const isDeleting_ = deletingId === t.id;

                  return (
                    <tr key={t.id} className={`group hover:bg-gray-50/50 transition-colors ${isConfirming ? "bg-red-50" : ""}`}>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <p className="text-[10px] font-black text-gray-500">
                          {new Date(t.date).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}
                        </p>
                        <p className="text-[9px] font-bold text-gray-300">
                          {new Date(t.date).getFullYear()}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wide ${config.bg} ${config.color}`}>
                          <Icon className="h-3 w-3" />
                          {config.label}
                        </span>
                        {t.taxAmount > 0 && (
                          <span className="block mt-1 text-[8px] font-bold text-blue-500 uppercase">+IVA ${t.taxAmount.toFixed(0)}</span>
                        )}
                      </td>
                      <td className="px-5 py-4 max-w-[220px]">
                        <p className="text-xs font-black text-gray-900 truncate">{t.description}</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mt-0.5">
                          {t.category}
                          {t.provider ? ` · ${t.provider}` : ""}
                          {t.paymentMethod ? ` · ${t.paymentMethod}` : ""}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        {t.quote ? (
                          <div>
                            <p className="text-[10px] font-black text-orange-600">{t.quote.folio}</p>
                            <p className="text-[9px] font-bold text-gray-400 truncate max-w-[120px]">{t.quote.project}</p>
                          </div>
                        ) : t.client ? (
                          <p className="text-[10px] font-bold text-gray-500">{t.client.name}</p>
                        ) : (
                          <span className="text-[9px] font-bold text-gray-300 uppercase">General</span>
                        )}
                      </td>
                      {/* Registrado por */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {t.createdBy ? (
                          <div className="flex items-center gap-1.5">
                            <UserAvatar name={t.createdBy.name} size="xs" />
                            <span className="text-[10px] font-bold text-gray-500 hidden sm:block">
                              {t.createdBy.name.split(" ")[0]}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-300">—</span>
                        )}
                      </td>
                      {/* Monto */}
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <p className={`text-sm font-black font-mono ${isIncome ? "text-emerald-600" : "text-red-600"}`}>
                          {isIncome ? "+" : "-"}${t.amount.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        {t.isVirtual ? (
                          <div className="flex justify-center">
                            <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest border border-gray-100 px-2 py-0.5 rounded-md bg-gray-50/50">Histórico</span>
                          </div>
                        ) : isConfirming ? (
                          <div className="flex items-center gap-2 justify-center">
                            <button
                              onClick={() => handleDelete(t.id)}
                              disabled={isDeleting_}
                              className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-[9px] font-black uppercase hover:bg-red-700 transition-all disabled:opacity-50"
                            >
                              {isDeleting_ ? <Loader2 className="h-3 w-3 animate-spin" /> : <AlertTriangle className="h-3 w-3" />}
                              Confirmar
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-3 py-1.5 border border-gray-200 text-gray-500 rounded-lg text-[9px] font-black uppercase hover:bg-gray-50 transition-all"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setEditTransaction(t)}
                              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(t.id)}
                              className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editTransaction && (
        <TransactionEditModal
          transaction={editTransaction}
          quotes={quotes}
          clients={clients}
          onClose={() => setEditTransaction(null)}
        />
      )}
    </div>
  );
}
