"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Search,
  Plus,
  Trash2,
  ChevronLeft,
  Loader2,
  DollarSign,
  User,
  CreditCard,
  Briefcase,
  X,
  FileCheck,
} from "lucide-react";
import Link from "next/link";
import Select from "@/components/ui/Select";
import StatusModal from "@/components/ui/StatusModal";

interface ClientData {
  id: string;
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
}

interface QuoteItem {
  id: string;
  folio: string;
  project: string;
  description?: string | null;
  total: number;
  subtotal: number;
  taxable: boolean;
  status: string;
  createdAt: string;
  client?: ClientData | null;
  prospectName?: string | null;
  concepts: Array<{
    description: string;
    quantity: number;
    finalUnitPrice: number;
  }>;
}

interface NewReceiptFormProps {
  clients: ClientData[];
  quotes: QuoteItem[];
}

export default function NewReceiptForm({ clients = [], quotes = [] }: NewReceiptFormProps) {
  const router = useRouter();

  // Form States
  const [clientId, setClientId] = useState("");
  const [prospectName, setProspectName] = useState("");
  const [project, setProject] = useState("");
  const [description, setDescription] = useState("");
  
  const [concepts, setConcepts] = useState<Array<{ description: string; quantity: number; unitPrice: number }>>([
    { description: "", quantity: 1, unitPrice: 0 },
  ]);

  const [advance, setAdvance] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("transferencia");
  const [notes, setNotes] = useState("");
  const [quoteId, setQuoteId] = useState<string | null>(null);

  // Modal State for importing quotes
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quoteSearch, setQuoteSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "error" as "success" | "error"
  });

  // Computations
  const subtotal = concepts.reduce((sum, c) => sum + (c.quantity * c.unitPrice), 0);
  const total = subtotal; // No automatic tax in receipts unless manually defined as a concept
  const numericAdvance = parseFloat(advance) || 0;
  const balance = total - numericAdvance;

  // Add a manual concept line
  function addConcept() {
    setConcepts([...concepts, { description: "", quantity: 1, unitPrice: 0 }]);
  }

  // Remove a concept line
  function removeConcept(index: number) {
    if (concepts.length === 1) {
      setConcepts([{ description: "", quantity: 1, unitPrice: 0 }]);
      return;
    }
    setConcepts(concepts.filter((_, i) => i !== index));
  }

  // Update concept values
  function updateConcept(index: number, field: string, value: any) {
    const updated = [...concepts];
    updated[index] = {
      ...updated[index],
      [field]: field === "description" ? value : parseFloat(value) || 0,
    };
    setConcepts(updated);
  }

  // Import quote data
  function handleImportQuote(quote: QuoteItem) {
    if (quote.client) {
      setClientId(quote.client.id);
      setProspectName("");
    } else {
      setClientId("");
      setProspectName(quote.prospectName || "");
    }

    setProject(quote.project);
    setDescription(quote.description || "");
    setQuoteId(quote.id);

    // Map concepts with tax factor if the quote was taxable
    const conceptsSum = quote.concepts.reduce((sum, c) => sum + (c.finalUnitPrice * c.quantity), 0);
    const isOldFormat = quote.taxable && Math.abs(conceptsSum - quote.total) < 0.05;
    
    const mapped = quote.concepts.map((c) => ({
      description: c.description,
      quantity: c.quantity,
      unitPrice: c.finalUnitPrice,
    }));

    // If it's a new format taxable quote, append an IVA row automatically
    if (quote.taxable && !isOldFormat && conceptsSum > 0) {
      mapped.push({
        description: "IVA 16%",
        quantity: 1,
        unitPrice: Number((conceptsSum * 0.16).toFixed(2)),
      });
    }

    setConcepts(mapped.length > 0 ? mapped : [{ description: "", quantity: 1, unitPrice: 0 }]);

    setIsQuoteModalOpen(false);
  }

  // Submit form
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!clientId && !prospectName) {
      setModalConfig({
        isOpen: true,
        title: "Falta Cliente",
        message: "Por favor seleccione un cliente o ingrese el nombre del prospecto.",
        type: "error"
      });
      return;
    }

    if (!project) {
      setModalConfig({
        isOpen: true,
        title: "Falta Proyecto",
        message: "Por favor ingrese el nombre del proyecto.",
        type: "error"
      });
      return;
    }

    const validConcepts = concepts.filter((c) => c.description.trim() !== "" && c.quantity > 0);
    if (validConcepts.length === 0) {
      setModalConfig({
        isOpen: true,
        title: "Conceptos Inválidos",
        message: "Debe agregar al menos un concepto válido con descripción y cantidad mayor a cero.",
        type: "error"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/receipts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId: clientId || null,
          prospectName: clientId ? null : prospectName,
          project,
          description,
          concepts: validConcepts,
          total,
          advance: numericAdvance,
          paymentMethod: paymentMethod.toUpperCase(),
          notes,
          quoteId,
        }),
      });

      if (res.ok) {
        router.push("/dashboard/receipts");
        router.refresh();
      } else {
        let errMsg = "Ocurrió un error inesperado.";
        try {
          const err = await res.json();
          errMsg = err.error || errMsg;
        } catch {
          try {
            const txt = await res.text();
            if (txt) errMsg = txt;
          } catch {}
        }
        setModalConfig({
          isOpen: true,
          title: "Error al Guardar",
          message: errMsg,
          type: "error"
        });
      }
    } catch (error) {
      console.error(error);
      setModalConfig({
        isOpen: true,
        title: "Error de Red",
        message: "No se pudo conectar con el servidor. Revise su conexión.",
        type: "error"
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Filter quotes based on search query
  const filteredQuotes = quotes.filter((q) => {
    const term = quoteSearch.toLowerCase().trim();
    if (!term) return true;

    const matchesFolio = (q.folio || "").toLowerCase().includes(term);
    const matchesProject = (q.project || "").toLowerCase().includes(term);
    const matchesClientName = (q.client?.name || q.prospectName || "").toLowerCase().includes(term);
    const matchesCompany = (q.client?.company || "").toLowerCase().includes(term);
    
    return matchesFolio || matchesProject || matchesClientName || matchesCompany;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/receipts"
            className="p-2 bg-gray-50 border border-gray-250/20 text-gray-500 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-gray-900 uppercase">Nuevo Recibo</h1>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">
              Crea un recibo o nota de pedido desde cero o impórtalo desde una cotización
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsQuoteModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 rounded-xl shadow-sm transition-all active:scale-95"
        >
          <Search className="h-4 w-4 text-blue-500" />
          Importar desde Cotización
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: General Info & Concepts */}
        <div className="lg:col-span-2 space-y-6">
          {/* General Section */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-2 flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-gray-400" /> Datos Generales
            </h3>

            {/* Client Picker */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Select
                  label="Cliente Registrado"
                  options={[
                    { value: "", label: "Seleccionar cliente..." },
                    ...clients.map((c) => ({ value: c.id, label: `${c.name}${c.company ? ` (${c.company})` : ""}` })),
                  ]}
                  value={clientId}
                  onChange={(val) => {
                    setClientId(val);
                    if (val) setProspectName("");
                  }}
                  placeholder="Buscar cliente..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                  O Nombre del Prospecto
                </label>
                <input
                  type="text"
                  placeholder="Nombre de cliente no registrado..."
                  value={prospectName}
                  onChange={(e) => {
                    setProspectName(e.target.value);
                    if (e.target.value) setClientId("");
                  }}
                  disabled={!!clientId}
                  className="w-full text-xs font-bold p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Project name */}
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                Proyecto *
              </label>
              <input
                type="text"
                required
                placeholder="Nombre descriptivo del proyecto / pedido..."
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="w-full text-xs font-bold p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 transition-all font-sans"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                Descripción / Detalles
              </label>
              <textarea
                rows={3}
                placeholder="Detalle general del trabajo..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xs font-bold p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 transition-all resize-none"
              />
            </div>
          </div>

          {/* Concepts Section */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-400" /> Conceptos del Recibo
              </h3>
              <button
                type="button"
                onClick={addConcept}
                className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-[10px] font-black uppercase tracking-wider transition-colors"
              >
                <Plus className="h-4.5 w-4.5" />
                Agregar Concepto
              </button>
            </div>

            {/* Concepts Grid List */}
            <div className="space-y-3">
              {concepts.map((concept, index) => (
                <div
                  key={index}
                  className="flex flex-col md:flex-row gap-3 p-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl items-end relative group hover:border-gray-200 transition-all"
                >
                  <div className="flex-1 w-full">
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-0.5">
                      Descripción del Concepto
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Corte de letrero en acrílico de 3mm..."
                      value={concept.description}
                      onChange={(e) => updateConcept(index, "description", e.target.value)}
                      className="w-full text-xs font-bold p-2.5 bg-white border border-gray-250/20 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                    />
                  </div>

                  <div className="w-full md:w-24">
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-0.5">
                      Cantidad
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={concept.quantity}
                      onChange={(e) => updateConcept(index, "quantity", e.target.value)}
                      className="w-full text-xs font-bold p-2.5 bg-white border border-gray-250/20 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 transition-all text-center"
                    />
                  </div>

                  <div className="w-full md:w-32">
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-0.5">
                      Precio Unitario ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={concept.unitPrice || ""}
                      onChange={(e) => updateConcept(index, "unitPrice", e.target.value)}
                      placeholder="0.00"
                      className="w-full text-xs font-black p-2.5 bg-white border border-gray-250/20 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 transition-all font-mono text-right"
                    />
                  </div>

                  <div className="w-full md:w-32 text-right">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Importe</p>
                    <p className="text-xs font-black text-gray-900 bg-gray-100/60 p-2.5 rounded-xl font-mono border border-gray-200/50">
                      ${(concept.quantity * concept.unitPrice).toLocaleString("es-MX", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeConcept(index)}
                    className="p-2.5 text-gray-400 hover:text-red-600 bg-white border border-gray-100 hover:border-red-100 rounded-xl transition-all shadow-sm shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Totals & Payments */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-2 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-gray-400" /> Totales y Pago
            </h3>

            {/* Calculations display */}
            <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <div className="flex justify-between text-xs font-bold text-gray-500">
                <span>Subtotal:</span>
                <span className="font-mono">${subtotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-gray-500 border-b pb-2">
                <span>IVA:</span>
                <span className="font-mono">$0.00</span>
              </div>
              <div className="flex justify-between text-sm font-black text-gray-900 pt-1">
                <span>TOTAL:</span>
                <span className="font-mono">${total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Advance payment input */}
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                Anticipo Pagado ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max={total}
                placeholder="0.00"
                value={advance}
                onChange={(e) => setAdvance(e.target.value)}
                className="w-full text-xs font-black p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 transition-all font-mono"
              />
              <p className="text-[9px] font-bold text-gray-400 uppercase mt-1 ml-1">
                Si no se da anticipo, deje en blanco o 0.
              </p>
            </div>

            {/* Pending balance calculation */}
            <div className="flex justify-between items-center p-3.5 bg-amber-50/50 border border-amber-100/50 rounded-2xl">
              <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider">Restante Pendiente:</span>
              <span className="text-xs font-black text-amber-700 font-mono">
                ${balance.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                Método de Pago
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full text-xs font-bold p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 transition-all uppercase"
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="deposito">Depósito</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            {/* Notes / Conditions */}
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                Notas y Condiciones del Recibo
              </label>
              <textarea
                rows={3}
                placeholder="Términos comerciales, tiempos de entrega específicos..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs font-bold p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 transition-all resize-none"
              />
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Guardando recibo...
                </>
              ) : (
                "Guardar Recibo"
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Quote Selection Modal */}
      {isQuoteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-zoom-in flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="bg-gray-950 p-5 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <FileCheck className="h-4.5 w-4.5 text-blue-500" />
                  Importar desde Cotización
                </h3>
                <p className="text-[9px] text-white/50 font-bold uppercase mt-0.5">
                  Selecciona una cotización aprobada para copiar todos sus datos
                </p>
              </div>
              <button
                onClick={() => setIsQuoteModalOpen(false)}
                className="text-white/60 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search filter inside modal */}
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar cotización por folio, proyecto o cliente..."
                  value={quoteSearch}
                  onChange={(e) => setQuoteSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                />
              </div>
            </div>

            {/* Quotes List */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {filteredQuotes.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  <FileText className="h-8 w-8 text-gray-200 mx-auto mb-3" />
                  <p className="text-[10px] font-black uppercase tracking-widest">No se encontraron cotizaciones</p>
                </div>
              ) : (
                filteredQuotes.map((quote) => (
                  <div
                    key={quote.id}
                    onClick={() => handleImportQuote(quote)}
                    className="p-4 hover:bg-gray-50/80 cursor-pointer flex justify-between items-center transition-colors text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-blue-600 font-mono">{quote.folio}</span>
                        <span
                          className={`px-2 py-0.5 text-[8px] font-black uppercase rounded ${
                            quote.status === "APPROVED" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {quote.status}
                        </span>
                      </div>
                      <p className="font-bold text-gray-900 mt-1">{quote.project}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Cliente: {quote.client?.name || quote.prospectName || "Sin cliente"}{quote.client?.company ? ` (${quote.client.company})` : ""}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-black text-gray-900 font-mono">
                        ${quote.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[9px] text-gray-400 mt-1">
                        {quote.concepts.length} Conceptos
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      <StatusModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
      />
    </div>
  );
}
