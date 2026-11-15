"use client";

import { useState, useRef } from "react";
import { 
  Plus, X, TrendingDown, TrendingUp, Briefcase, 
  ChevronRight, ChevronLeft, Loader2, Receipt,
  CreditCard, Building, FileText, CalendarDays,
  DollarSign
} from "lucide-react";
import { createTransaction } from "@/app/dashboard/finance/actions";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from "@/app/dashboard/finance/constants";
import Select from "@/components/ui/Select";

const TYPES = [
  {
    value: "GASTO_OPERATIVO",
    label: "Gasto Operativo",
    desc: "Gastos generales del negocio (renta, luz, nómina…)",
    icon: TrendingDown,
    color: "bg-red-50 border-red-200 text-red-700",
    activeColor: "bg-red-600 border-red-600 text-white shadow-lg shadow-red-600/30",
    dot: "bg-red-500",
  },
  {
    value: "GASTO_PROYECTO",
    label: "Gasto de Proyecto",
    desc: "Material o servicio ligado a un trabajo específico",
    icon: Briefcase,
    color: "bg-amber-50 border-amber-200 text-amber-700",
    activeColor: "bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/30",
    dot: "bg-amber-500",
  },
  {
    value: "INGRESO",
    label: "Ingreso / Cobro",
    desc: "Anticipo, liquidación o pago de proyecto",
    icon: TrendingUp,
    color: "bg-emerald-50 border-emerald-200 text-emerald-700",
    activeColor: "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-600/30",
    dot: "bg-emerald-500",
  },
  {
    value: "INGRESO_RAPIDO",
    label: "Venta Rápida / Mostrador",
    desc: "Ingreso directo en efectivo por trabajos rápidos sin cotización previa",
    icon: DollarSign,
    color: "bg-emerald-50 border-emerald-200 text-emerald-700",
    activeColor: "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-600/30",
    dot: "bg-emerald-500",
  },
  {
    value: "AJUSTE",
    label: "Ajuste Manual",
    desc: "Correcciones, devoluciones u otros movimientos",
    icon: Receipt,
    color: "bg-gray-50 border-gray-200 text-gray-600",
    activeColor: "bg-gray-800 border-gray-800 text-white shadow-lg shadow-gray-900/20",
    dot: "bg-gray-500",
  },
];

interface TransactionFormProps {
  quotes?: { id: string; folio: string; project: string }[];
  clients?: { id: string; name: string; company?: string | null }[];
}

export default function TransactionForm({ quotes = [], clients = [] }: TransactionFormProps) {
  const [isOpen, setIsOpen]       = useState(false);
  const [step, setStep]           = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState<string>("");
  const [applyIVA, setApplyIVA]   = useState(false);
  const [amount, setAmount]       = useState("");
  const [category, setCategory]   = useState("");
  const [quoteId, setQuoteId]     = useState("");
  const [clientId, setClientId]   = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const isExpense = selectedType === "GASTO_OPERATIVO" || selectedType === "GASTO_PROYECTO";
  const isIncome  = selectedType === "INGRESO" || selectedType === "AJUSTE" || selectedType === "INGRESO_RAPIDO";
  const isProject = selectedType === "GASTO_PROYECTO";
  const categories = isExpense ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const ivaAmount = applyIVA ? (parseFloat(amount) || 0) * 0.16 : 0;

  const typeConfig = TYPES.find(t => t.value === selectedType);

  function resetForm() {
    setStep(1);
    setSelectedType("");
    setApplyIVA(false);
    setAmount("");
    setCategory("");
    setQuoteId("");
    setClientId("");
    setPaymentMethod("");
    formRef.current?.reset();
  }

  function handleClose() {
    setIsOpen(false);
    setTimeout(resetForm, 300);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      formData.set("taxAmount", ivaAmount.toString());
      await createTransaction(formData);
      handleClose();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-black transition-colors active:scale-95"
      >
        <Plus className="h-4 w-4 text-red-500" />
        Registrar movimiento
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gray-900 p-6 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${typeConfig?.dot || "bg-white/30"}`} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                    {step === 1 ? "Paso 1 de 2 — Tipo de movimiento" : `Paso 2 de 2 — ${typeConfig?.label}`}
                  </span>
                </div>
                <h3 className="text-sm font-black uppercase tracking-widest text-white">
                  {step === 1 ? "¿Qué tipo de movimiento es?" : "Detalles del movimiento"}
                </h3>
              </div>
              <button onClick={handleClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/60 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Step 1 — Type Selection */}
            {step === 1 && (
              <div className="p-6 space-y-3">
                {TYPES.map((t) => {
                  const Icon = t.icon;
                  const isActive = selectedType === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setSelectedType(t.value)}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                        isActive ? t.activeColor : t.color
                      }`}
                    >
                      <div className={`p-2 rounded-xl ${isActive ? "bg-white/20" : "bg-white"}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-black uppercase tracking-tight">{t.label}</p>
                        <p className={`text-[10px] font-bold mt-0.5 ${isActive ? "text-white/70" : "opacity-60"}`}>
                          {t.desc}
                        </p>
                      </div>
                      {isActive && <ChevronRight className="h-4 w-4 shrink-0" />}
                    </button>
                  );
                })}

                <button
                  type="button"
                  disabled={!selectedType}
                  onClick={() => {
                    if (selectedType === "INGRESO_RAPIDO") {
                      setCategory("Trabajo Rápido / Sin Cotización");
                      setPaymentMethod("efectivo");
                    }
                    setStep(2);
                  }}
                  className="w-full mt-2 py-4 rounded-2xl bg-gray-900 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none shadow-xl"
                >
                  Continuar
                </button>
              </div>
            )}

            {/* Step 2 — Details */}
            {step === 2 && (
              <form ref={formRef} onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <input type="hidden" name="type" value={selectedType === "INGRESO_RAPIDO" ? "INGRESO" : selectedType} />
                <input type="hidden" name="taxAmount" value={ivaAmount} />

                {/* Descripción */}
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                    <FileText className="h-3 w-3 inline mr-1" />Descripción *
                  </label>
                  <input
                    name="description"
                    type="text"
                    required
                    placeholder={isExpense ? "Ej: Compra de acrílico para proyecto X" : (selectedType === "INGRESO_RAPIDO" ? "Ej: Trabajo de corte o grabado express cliente mostrador" : "Ej: Anticipo proyecto letrero luminoso")}
                    className="w-full text-xs font-bold p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-gray-900 transition-all"
                  />
                </div>

                {/* Monto + Fecha */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                      Monto ($) *
                    </label>
                    <input
                      name="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full text-xs font-black p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-gray-900 transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                      <CalendarDays className="h-3 w-3 inline mr-1" />Fecha *
                    </label>
                    <input
                      name="date"
                      type="date"
                      required
                      defaultValue={new Date().toISOString().split("T")[0]}
                      className="w-full text-xs font-bold p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-gray-900 transition-all"
                    />
                  </div>
                </div>

                {/* Categoría */}
                <div>
                  <input type="hidden" name="category" value={category} />
                  <Select
                    label="Categoría *"
                    options={categories.map(c => ({ value: c, label: c }))}
                    value={category}
                    onChange={setCategory}
                    placeholder="Seleccionar categoría..."
                  />
                </div>

                {/* IVA Toggle */}
                <div className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  applyIVA ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-100"
                }`}
                  onClick={() => setApplyIVA(!applyIVA)}
                >
                  <div>
                    <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest">
                      {isExpense ? "¿Tiene IVA acreditable?" : "¿Incluye IVA en el monto?"}
                    </p>
                    {applyIVA && amount && (
                      <p className="text-[10px] font-bold text-amber-600 mt-0.5">
                        IVA: ${ivaAmount.toFixed(2)} | Total c/IVA: ${(parseFloat(amount) + ivaAmount).toFixed(2)}
                      </p>
                    )}
                    {!applyIVA && (
                      <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                        {isExpense ? "Factura sin IVA o sin comprobante" : "Sin factura / cliente sin IVA"}
                      </p>
                    )}
                  </div>
                  <div className={`w-12 h-6 rounded-full transition-all relative ${applyIVA ? "bg-amber-500" : "bg-gray-200"}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${applyIVA ? "left-7" : "left-1"}`} />
                  </div>
                </div>

                {/* Proyecto (si es GASTO_PROYECTO) */}
                {isProject && (
                  <div>
                    <input type="hidden" name="quoteId" value={quoteId} />
                    <Select
                      label="Proyecto / Cotización"
                      options={[
                        { value: "", label: "Sin proyecto específico" },
                        ...quotes.map(q => ({ value: q.id, label: `${q.folio} — ${q.project}` }))
                      ]}
                      value={quoteId}
                      onChange={setQuoteId}
                      className="bg-amber-50/30 rounded-xl"
                    />
                  </div>
                )}

                {/* Cliente (opcional en ingresos) */}
                {!isExpense && (
                  <div>
                    <input type="hidden" name="clientId" value={clientId} />
                    <Select
                      label="Cliente"
                      options={[
                        { value: "", label: "Seleccionar cliente..." },
                        ...clients.map(c => ({ value: c.id, label: `${c.name}${c.company ? ` (${c.company})` : ""}` }))
                      ]}
                      value={clientId}
                      onChange={setClientId}
                      className="bg-emerald-50/30 rounded-xl"
                    />
                  </div>
                )}

                {/* Método de pago + Proveedor */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input type="hidden" name="paymentMethod" value={paymentMethod} />
                    <Select
                      label="Método"
                      options={[
                        { value: "", label: "Seleccionar..." },
                        ...PAYMENT_METHODS.map(m => ({ value: m.value, label: m.label }))
                      ]}
                      value={paymentMethod}
                      onChange={setPaymentMethod}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                      Proveedor
                    </label>
                    <input
                      name="provider"
                      type="text"
                      placeholder="Opcional"
                      className="w-full text-xs font-bold p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-gray-900 transition-all"
                    />
                  </div>
                </div>

                {/* Notas */}
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                    Notas internas
                  </label>
                  <textarea
                    name="notes"
                    rows={2}
                    placeholder="Información adicional..."
                    className="w-full text-xs font-bold p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-gray-900 transition-all resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-gray-100 text-gray-400 text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all"
                  >
                    <ChevronLeft className="h-3 w-3" />
                    Cambiar tipo
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 shadow-lg text-white
                      ${isExpense ? "bg-red-600 hover:bg-red-700 shadow-red-600/20" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"}
                      disabled:opacity-50 disabled:pointer-events-none`}
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {isLoading ? "Guardando..." : "Guardar Movimiento"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
