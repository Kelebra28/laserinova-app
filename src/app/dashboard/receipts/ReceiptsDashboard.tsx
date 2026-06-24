"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Receipt,
  Plus,
  Search,
  Download,
  DollarSign,
  Clock,
  CheckCircle,
  FileText,
  User,
  X,
  CreditCard,
  Briefcase,
  AlertTriangle,
  Loader2,
  Calendar,
  Layers,
} from "lucide-react";
import { useRouter } from "next/navigation";
import StatusModal from "@/components/ui/StatusModal";

interface ClientData {
  id: string;
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
}

interface UserData {
  id: string;
  name: string;
  email: string;
}

interface Concept {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface ReceiptItem {
  id: string;
  folio: string;
  clientId?: string | null;
  prospectName?: string | null;
  userId: string;
  project: string;
  description?: string | null;
  concepts?: Concept[] | any;
  total: number;
  advance: number;
  balance: number;
  paymentMethod: string;
  notes?: string | null;
  status: string;
  quoteId?: string | null;
  createdAt: string;
  client?: ClientData | null;
  user: UserData;
}

export default function ReceiptsDashboard() {
  const router = useRouter();
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptItem | null>(null);
  
  // Payment Modal State
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("transferencia");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [showSignatures, setShowSignatures] = useState(true);

  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "error" as "success" | "error"
  });

  // Fetch receipts from API
  async function fetchReceipts() {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.append("search", search);
      if (statusFilter) queryParams.append("status", statusFilter);

      const res = await fetch(`/api/receipts?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReceipts(data);
      }
    } catch (error) {
      console.error("Error fetching receipts:", error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchReceipts();
  }, [search, statusFilter]);

  // Handle registering a new payment (abono)
  async function handleRegisterPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedReceipt || !paymentAmount) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0 || amount > selectedReceipt.balance) {
      setModalConfig({
        isOpen: true,
        title: "Monto Inválido",
        message: "Por favor ingrese un monto válido que no exceda el saldo pendiente.",
        type: "error"
      });
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const res = await fetch(`/api/receipts/${selectedReceipt.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          addPaymentAmount: amount,
          paymentMethod: paymentMethod.toUpperCase(),
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        // Update selected receipt
        setSelectedReceipt({
          ...selectedReceipt,
          advance: updated.advance,
          balance: updated.balance,
          status: updated.status,
        });
        setIsPaymentOpen(false);
        setPaymentAmount("");
        fetchReceipts();
      } else {
        let errMsg = "Error al registrar el pago.";
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
          title: "Error al registrar pago",
          message: errMsg,
          type: "error"
        });
      }
    } catch (error) {
      console.error(error);
      setModalConfig({
        isOpen: true,
        title: "Error de Red",
        message: "No se pudo registrar el pago. Verifique su conexión de red.",
        type: "error"
      });
    } finally {
      setIsSubmittingPayment(false);
    }
  }

  // Handle full liquidation shortcut
  async function handleQuickLiquidation(receipt: ReceiptItem) {
    if (!confirm(`¿Está seguro que desea liquidar la totalidad de $${receipt.balance.toFixed(2)} para el folio ${receipt.folio}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/receipts/${receipt.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "PAID",
        }),
      });

      if (res.ok) {
        fetchReceipts();
        if (selectedReceipt?.id === receipt.id) {
          const updated = await res.json();
          setSelectedReceipt(updated);
        }
      } else {
        let errMsg = "Error al liquidar el recibo.";
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
          title: "Error al liquidar recibo",
          message: errMsg,
          type: "error"
        });
      }
    } catch (error) {
      console.error(error);
      setModalConfig({
        isOpen: true,
        title: "Error de Red",
        message: "No se pudo liquidar el recibo debido a un problema de red.",
        type: "error"
      });
    }
  }

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString("es-MX", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Receipt className="h-6 w-6 text-blue-600" />
            RECIBOS Y NOTAS DE PEDIDO
          </h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
            Gestión de notas de pedido, anticipos y liquidaciones pendientes
          </p>
        </div>

        <Link
          href="/dashboard/receipts/new"
          className="inline-flex items-center justify-center px-5 py-2.5 border border-transparent text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-600/20 text-white bg-blue-600 hover:bg-blue-700 transition-all active:scale-95"
        >
          <Plus className="-ml-1 mr-2 h-4 w-4" />
          Nuevo Recibo
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Recibos</p>
            <p className="text-xl font-black text-gray-900 mt-1">{receipts.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Liquidados</p>
            <p className="text-xl font-black text-gray-900 mt-1">
              {receipts.filter((r) => r.status === "PAID").length}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pendientes</p>
            <p className="text-xl font-black text-gray-900 mt-1">
              {receipts.filter((r) => r.status === "PENDING").length}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Table Card */}
      <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/30">
          <div className="w-full sm:max-w-md relative">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por folio, cliente o proyecto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-600 transition-all placeholder:text-gray-400 shadow-sm"
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => setStatusFilter("")}
              className={`flex-1 sm:flex-none px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl border transition-all ${
                statusFilter === ""
                  ? "bg-gray-950 text-white border-gray-950"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setStatusFilter("PENDING")}
              className={`flex-1 sm:flex-none px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl border transition-all ${
                statusFilter === "PENDING"
                  ? "bg-amber-600 text-white border-amber-600"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              Pendientes
            </button>
            <button
              onClick={() => setStatusFilter("PAID")}
              className={`flex-1 sm:flex-none px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl border transition-all ${
                statusFilter === "PAID"
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              Liquidados
            </button>
          </div>
        </div>

        {/* Receipts Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Folio</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Proyecto</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Monto Total</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Anticipo</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Restante</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Estatus</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha</th>
                <th className="relative px-6 py-4"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <Loader2 className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-3" />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cargando recibos...</p>
                  </td>
                </tr>
              ) : receipts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <FileText className="h-8 w-8 text-gray-200 mx-auto mb-3" />
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">No hay recibos registrados</p>
                  </td>
                </tr>
              ) : (
                receipts.map((receipt) => (
                  <tr
                    key={receipt.id}
                    onClick={() => setSelectedReceipt(receipt)}
                    className="hover:bg-gray-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-black text-blue-600">
                      {receipt.folio}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-900 font-bold">
                      {receipt.client?.name || receipt.prospectName || "Sin cliente"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600 font-bold">
                      {receipt.project}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-black text-gray-950">
                      {formatCurrency(receipt.total)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-emerald-600 font-bold">
                      {formatCurrency(receipt.advance)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-xs font-black ${receipt.balance > 0 ? "text-amber-600" : "text-gray-400"}`}>
                      {formatCurrency(receipt.balance)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 inline-flex text-[9px] font-black uppercase tracking-wider rounded-full ${
                          receipt.status === "PAID"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {receipt.status === "PAID" ? "Liquidado" : "Pendiente"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-bold">
                      {new Date(receipt.createdAt).toLocaleDateString("es-MX")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/api/receipts/${receipt.id}/pdf?showSignatures=true`}
                          target="_blank"
                          rel="noreferrer"
                          title="Descargar PDF"
                          className="p-1.5 hover:bg-gray-150 rounded-lg text-gray-500 hover:text-blue-600 transition-colors"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        {receipt.status === "PENDING" && (
                          <button
                            onClick={() => handleQuickLiquidation(receipt)}
                            title="Liquidar saldo"
                            className="p-1.5 hover:bg-emerald-50 rounded-lg text-gray-400 hover:text-emerald-600 transition-colors"
                          >
                            <DollarSign className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Detail Panel */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex justify-end">
          {/* Overlay click to close */}
          <div className="absolute inset-0" onClick={() => setSelectedReceipt(null)} />

          {/* Panel */}
          <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl z-50 flex flex-col animate-slide-in overflow-hidden">
            {/* Header */}
            <div className="bg-gray-950 p-6 text-white flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                    Recibo
                  </span>
                  <span className="text-xs font-black font-mono tracking-widest">{selectedReceipt.folio}</span>
                </div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white mt-1">
                  {selectedReceipt.project}
                </h3>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/60 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Financial Status Summary */}
              <div className="grid grid-cols-3 gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center">
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Total</p>
                  <p className="text-base font-black text-gray-950 mt-0.5">{formatCurrency(selectedReceipt.total)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Anticipo / Pagos</p>
                  <p className="text-base font-black text-emerald-600 mt-0.5">{formatCurrency(selectedReceipt.advance)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Por Pagar</p>
                  <p className={`text-base font-black mt-0.5 ${selectedReceipt.balance > 0 ? "text-amber-600" : "text-gray-400"}`}>
                    {formatCurrency(selectedReceipt.balance)}
                  </p>
                </div>
              </div>

              {/* Status Ribbon */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                selectedReceipt.status === "PAID"
                  ? "bg-emerald-50 border-emerald-100 text-emerald-800"
                  : "bg-amber-50 border-amber-100 text-amber-800"
              }`}>
                <div className="flex items-center gap-2.5">
                  {selectedReceipt.status === "PAID" ? (
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <Clock className="h-5 w-5 text-amber-600" />
                  )}
                  <div>
                    <p className="text-xs font-black uppercase tracking-tight">
                      {selectedReceipt.status === "PAID" ? "Estatus: Liquidado" : "Estatus: Pendiente de Pago"}
                    </p>
                    <p className="text-[10px] opacity-75 mt-0.5 font-bold">
                      {selectedReceipt.status === "PAID"
                        ? "Este pedido ha sido totalmente cubierto financieramente."
                        : "Falta cubrir el saldo pendiente para liquidar."}
                    </p>
                  </div>
                </div>

                {selectedReceipt.status === "PENDING" && (
                  <button
                    onClick={() => setIsPaymentOpen(true)}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm active:scale-95 transition-all"
                  >
                    Registrar Abono
                  </button>
                )}
              </div>

              {/* Details & Relations */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-2">Información del Pedido</h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Cliente / Prospecto</p>
                    <div className="flex items-center gap-2 mt-1">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-xs font-bold text-gray-900">
                        {selectedReceipt.client?.name || selectedReceipt.prospectName || "Sin cliente asignado"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Registrado por</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-[9px] font-black text-blue-700 uppercase">
                        {selectedReceipt.user.name.charAt(0)}
                      </div>
                      <span className="text-xs font-bold text-gray-900">{selectedReceipt.user.name}</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Método de Pago</p>
                    <div className="flex items-center gap-2 mt-1">
                      <CreditCard className="h-4 w-4 text-gray-400" />
                      <span className="text-xs font-black uppercase text-gray-700">{selectedReceipt.paymentMethod}</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Fecha Registro</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-xs font-bold text-gray-700">
                        {new Date(selectedReceipt.createdAt).toLocaleString("es-MX")}
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Firmas en PDF</p>
                    <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={showSignatures}
                        onChange={(e) => setShowSignatures(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4.5 w-4.5 transition-all"
                      />
                      <span className="text-xs font-bold text-gray-700">
                        Incluir firmas
                      </span>
                    </label>
                  </div>
                </div>

                {selectedReceipt.description && (
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Descripción del Proyecto</p>
                    <p className="text-xs text-gray-600 mt-1.5 font-bold leading-relaxed bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                      {selectedReceipt.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Concepts Grid / List */}
              {selectedReceipt.concepts && (selectedReceipt.concepts as any[]).length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-2">Conceptos / Partidas</h4>
                  
                  <div className="border border-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-50">
                    {(selectedReceipt.concepts as any[]).map((concept, index) => {
                      const unitPrice = concept.unitPrice || concept.finalUnitPrice || 0;
                      return (
                        <div key={index} className="p-3 bg-gray-50/20 flex justify-between items-center text-xs">
                          <div>
                            <p className="font-bold text-gray-900">{concept.description}</p>
                            <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                              Cantidad: {concept.quantity} | P. Unitario: {formatCurrency(unitPrice)}
                            </p>
                          </div>
                          <span className="font-black text-gray-950">
                            {formatCurrency(unitPrice * (concept.quantity || 1))}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Order Notes / Terms */}
              {selectedReceipt.notes && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-2">Notas Especiales / Condiciones</h4>
                  <p className="text-xs text-gray-600 bg-amber-50/40 p-4 rounded-xl border border-amber-100/40 font-bold leading-relaxed">
                    {selectedReceipt.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Actions Bar Footer */}
            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-3">
              <a
                href={`/api/receipts/${selectedReceipt.id}/pdf?showSignatures=${showSignatures}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 py-3 border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm"
              >
                <Download className="h-4 w-4 text-gray-400" />
                Descargar PDF
              </a>

              {selectedReceipt.status === "PENDING" && (
                <button
                  onClick={() => handleQuickLiquidation(selectedReceipt)}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-600/20"
                >
                  <DollarSign className="h-4 w-4" />
                  Liquidar Totalidad
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Registry Modal */}
      {isPaymentOpen && selectedReceipt && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-zoom-in">
            <div className="bg-gray-950 p-5 text-white flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blue-500" />
                Registrar Abono
              </h3>
              <button
                onClick={() => setIsPaymentOpen(false)}
                className="text-white/60 hover:text-white hover:bg-white/10 p-1 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterPayment} className="p-6 space-y-4">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  Saldo Pendiente Actual
                </p>
                <p className="text-lg font-black text-amber-600 font-mono">
                  {formatCurrency(selectedReceipt.balance)}
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  Monto a Abonar ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedReceipt.balance}
                  required
                  placeholder="0.00"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full text-xs font-black p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  Método de Pago *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full text-xs font-bold p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 transition-all uppercase"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta de Crédito / Débito</option>
                  <option value="deposito">Depósito Bancario</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentOpen(false)}
                  className="flex-1 py-3 border border-gray-200 text-gray-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-55 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSubmittingPayment ? "Registrando..." : "Registrar Pago"}
                </button>
              </div>
            </form>
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
