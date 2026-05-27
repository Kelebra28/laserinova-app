import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Download, Mail, FileText, Settings, User, TrendingUp, TrendingDown, Clock, Loader2, Trash2, Edit, CreditCard, DollarSign, Briefcase, AlertCircle } from "lucide-react";
import { notFound } from "next/navigation";
import { updateQuoteStatus, updateQuoteConsiderations, updateQuotePayment, deleteQuote } from "./actions";
import SubmitButton from "@/components/ui/SubmitButton";
import StatusGridButton from "@/components/quotes/StatusGridButton";
import DeleteQuoteButton from "@/components/quotes/DeleteQuoteButton";
import PaymentStatusForm from "@/components/quotes/PaymentStatusForm";
import CalculationAudit from "@/components/quotes/CalculationAudit";
import { UserAvatar } from "@/components/ui/UserAvatar";
import QuoteVersionTabs from "@/components/quotes/QuoteVersionTabs";
import CloneQuoteButton from "@/components/quotes/CloneQuoteButton";

const statusLabels: Record<string, string> = {
  DRAFT: "Borrador",
  CALCULATED: "Calculada",
  SENT: "Enviada",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  IN_PRODUCTION: "En Producción",
  DELIVERED: "Entregada",
  CANCELLED: "Cancelada",
};

const paymentStatusLabels: Record<string, string> = {
  PENDING: "Por cobrar",
  PARTIAL: "Con adelanto",
  PAID: "Pagada",
  REFUNDED: "Reembolsada",
};

const paymentStatusColors: Record<string, string> = {
  PENDING: "text-red-600 bg-red-50 border-red-100",
  PARTIAL: "text-orange-600 bg-orange-50 border-orange-100",
  PAID: "text-emerald-600 bg-emerald-50 border-emerald-100",
  REFUNDED: "text-gray-600 bg-gray-50 border-gray-200",
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800 border-gray-200",
  CALCULATED: "bg-blue-100 text-blue-800 border-blue-200",
  SENT: "bg-purple-100 text-purple-800 border-purple-200",
  APPROVED: "bg-green-100 text-green-800 border-green-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
  IN_PRODUCTION: "bg-orange-100 text-orange-800 border-orange-200",
  DELIVERED: "bg-teal-100 text-teal-800 border-teal-200",
  CANCELLED: "bg-black text-white border-black",
};

export default async function QuoteDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const quoteId = params.id;
  
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      client: true,
      user: true,
      concepts: {
        orderBy: { order: 'asc' },
        include: { material: true }
      }
    }
  });

  if (!quote) {
    notFound();
  }

  const clients = await prisma.client.findMany({
    where: { active: true },
    orderBy: { name: "asc" }
  });

  // Fetch sibling versions if this is part of a group
  let versions = [quote];
  if (quote.versionGroupId) {
    versions = await prisma.quote.findMany({
      where: { versionGroupId: quote.versionGroupId },
      select: { id: true, versionName: true, status: true, total: true, folio: true },
      orderBy: { createdAt: 'asc' }
    }) as any;
  }

  const defaultConsiderations = "- Tiempo de entrega: de 1 a 3 días hábiles.\n- 50% anticipo, 50% al programar envío o entrega.\n- El costo puede variar si hay cambios en medidas o diseño.\n- Vigencia de cotización 20 días.";

  const isCancelled = quote.status === "CANCELLED" || quote.status === "REJECTED";
  const effectiveRealUtility = isCancelled ? 0 : (quote.realUtilityTotal || 0);
  const isLoss = !isCancelled && (quote.realUtilityTotal || 0) < 0;

  const parsedImages = quote.images ? (typeof quote.images === 'string' ? JSON.parse(quote.images) : quote.images) : [];
  const images: string[] = Array.isArray(parsedImages) ? parsedImages : [];

  return (
    <div className="space-y-6 max-w-7xl pb-10">
      {/* 1. Ultra Premium Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center space-x-5">
          <Link
            href="/dashboard/quotes"
            className="p-3 text-gray-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-all border border-gray-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                {quote.folio}
              </h1>
              <div className="flex gap-2">
                <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border shadow-sm ${statusColors[quote.status]}`}>
                  {statusLabels[quote.status]}
                </span>
                <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border shadow-sm ${paymentStatusColors[quote.paymentStatus || "PENDING"]}`}>
                  {paymentStatusLabels[quote.paymentStatus || "PENDING"]}
                </span>
              </div>
            </div>
            <p className="text-sm font-medium text-gray-400 mt-0.5">{quote.project}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
            <Link
              href={`/dashboard/quotes/${quote.id}/edit`}
              className="inline-flex items-center px-4 py-2 text-gray-600 text-xs font-bold rounded-lg hover:bg-white hover:text-red-600 transition-all active:scale-95"
            >
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Link>
            <CloneQuoteButton quoteId={quote.id} clients={clients} />
            <DeleteQuoteButton quoteId={quote.id} />
          </div>
          
          <a
            href={`/api/quotes/${quote.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-6 py-2.5 bg-gray-900 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-black transition-all shadow-lg active:scale-95"
          >
            <Download className="mr-2 h-4 w-4" />
            PDF Individual
          </a>
          {versions.length > 1 && (
            <a
              href={`/api/quotes/${quote.id}/pdf?allVersions=true`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-2.5 bg-red-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-red-700 transition-all shadow-lg active:scale-95"
            >
              <FileText className="mr-2 h-4 w-4" />
              PDF Comparativo
            </a>
          )}
        </div>
      </div>

      <QuoteVersionTabs 
        versions={versions} 
        currentQuoteId={quote.id} 
        versionGroupId={quote.versionGroupId} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Main Content Area (8/12) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Bento Financial Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Monto Total</span>
              <span className="text-2xl font-black text-gray-900">${quote.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Monto Cobrado</span>
              <span className="text-2xl font-black text-emerald-600">${(quote.realAmountCollected || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className={`p-5 rounded-2xl border shadow-sm ${isCancelled ? "bg-gray-50 border-gray-100" : isLoss ? "bg-red-50 border-red-100" : "bg-emerald-50 border-emerald-100"}`}>
              <div className="flex justify-between items-start">
                <div>
                  <span className={`text-[10px] font-black uppercase tracking-widest block mb-1 ${isCancelled ? "text-gray-400" : isLoss ? "text-red-400" : "text-emerald-500"}`}>Utilidad Real</span>
                  <span className={`text-2xl font-black ${isCancelled ? "text-gray-400" : isLoss ? "text-red-600" : "text-emerald-600"}`}>${effectiveRealUtility.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                {isCancelled ? <AlertCircle className="h-5 w-5 text-gray-300" /> : isLoss ? <TrendingDown className="h-5 w-5 text-red-400" /> : <TrendingUp className="h-5 w-5 text-emerald-500" />}
              </div>
            </div>
          </div>

          {/* Concepts Table Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-red-600" />
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Conceptos de Cotización</h3>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead>
                  <tr className="bg-white">
                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Cant</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Descripción</th>
                    <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Costo U.</th>
                    <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Unitario Venta</th>
                    <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Utilidad</th>
                    <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {quote.concepts.map((concept) => {
                    const conceptsSum = quote.concepts.reduce((sum, c) => sum + (c.totalAmount || 0), 0);
                    // Si la suma de conceptos es igual al total (y taxable es true), significa que se guardó en el formato anterior (con IVA incluido)
                    const isOldFormat = quote.taxable && Math.abs(conceptsSum - quote.total) < 0.05;
                    const taxFactor = isOldFormat && quote.subtotal > 0 ? (quote.total / quote.subtotal) : 1;
                    
                    const netUnitPrice = concept.finalUnitPrice / taxFactor;
                    const netTotal = concept.totalAmount / taxFactor;
                    
                    return (
                      <tr key={concept.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-600 font-bold">{concept.quantity}</td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-black text-gray-900">{concept.description}</div>
                          {concept.material && (
                            <div className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">{concept.material.name}</div>
                          )}
                          <div className="text-[9px] font-bold text-gray-400 uppercase mt-1 px-1.5 py-0.5 bg-gray-100 rounded-md inline-block">{concept.conceptType === 'RESALE' ? 'REVENTA' : concept.conceptType}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-red-600 text-right font-mono font-bold">${((concept.realCost || 0) / concept.quantity).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 text-right font-mono font-bold">${netUnitPrice.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4 text-sm text-emerald-600 text-right font-mono font-bold">${((concept.totalAmount || 0) - (concept.realCost || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4 text-sm font-black text-gray-900 text-right font-mono">${netTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="bg-gray-50/50 p-6 border-t border-gray-100">
               <div className="flex flex-col items-end space-y-2">
                  <div className="flex justify-between w-full max-w-[240px]">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Subtotal</span>
                    <span className="text-sm font-bold text-gray-900 font-mono">${quote.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between w-full max-w-[240px]">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">IVA (16%)</span>
                    <span className="text-sm font-bold text-gray-900 font-mono">${quote.tax.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between w-full max-w-[240px] pt-3 border-t border-gray-200 mt-2">
                    <span className="text-sm font-black text-gray-900 uppercase tracking-tight">Total Final</span>
                    <span className="text-xl font-black text-red-600 font-mono">${quote.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
               </div>
            </div>
          </div>

          {/* Considerations Editor */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="h-4 w-4 text-gray-400" />
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Términos y Condiciones (PDF)</h3>
            </div>
            <form action={updateQuoteConsiderations} className="space-y-4">
              <input type="hidden" name="quoteId" value={quote.id} />
              <textarea
                key={quote.visibleConsiderations ?? "default"}
                name="visibleConsiderations"
                defaultValue={quote.visibleConsiderations || defaultConsiderations}
                rows={5}
                className="w-full text-xs font-mono p-4 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all outline-none"
                placeholder="Escribe las consideraciones que aparecerán en el PDF..."
              />
              <div className="flex justify-end">
                <SubmitButton
                  variant="dark"
                  loadingText="Guardando..."
                  className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl shadow-md"
                >
                  Actualizar PDF
                </SubmitButton>
              </div>
            </form>
          </div>

          {/* Galería de Imágenes */}
          {images.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-4 border-b border-gray-50 pb-3">Imágenes de Referencia</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {images.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block group overflow-hidden rounded-xl border border-gray-100 shadow-sm relative">
                    <img src={url} alt={`Imagen ${i + 1}`} className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Area (4/12) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* 1. Client Card (Primary Context) */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-6 border-b border-gray-50 pb-4">
              <div className="p-2 bg-red-50 rounded-lg">
                <User className="h-4 w-4 text-red-600" />
              </div>
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Información del Cliente</h3>
            </div>
            {quote.client ? (
              <div className="space-y-4">
                <div>
                  <p className="text-base font-black text-gray-900">{quote.client.name}</p>
                  {quote.client.company && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Briefcase className="h-3 w-3 text-gray-400" />
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-tight">{quote.client.company}</p>
                    </div>
                  )}
                </div>
                <div className="space-y-2 pt-2">
                  {quote.client.email && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 font-medium bg-gray-50 p-2 rounded-lg">
                      <Mail className="h-3.5 w-3.5 text-gray-400" />
                      {quote.client.email}
                    </div>
                  )}
                  {quote.client.phone && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 font-medium bg-gray-50 p-2 rounded-lg">
                      <DollarSign className="h-3.5 w-3.5 text-gray-400" />
                      {quote.client.phone}
                    </div>
                  )}
                </div>
              </div>
            ) : (quote as any).prospectName ? (
              <div className="space-y-2">
                <p className="text-base font-black text-gray-900">{(quote as any).prospectName}</p>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 border border-orange-200 text-[10px] font-black text-orange-600 uppercase tracking-widest">
                  Prospecto
                </span>
                <p className="text-[10px] text-gray-400 font-medium">No registrado como cliente aún</p>
              </div>
            ) : (
              <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest bg-gray-50 p-6 rounded-xl border border-dashed border-gray-200 text-center">
                Modo Calculadora
              </div>
            )}
          </div>

          {/* 2. Creado por */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4 border-b border-gray-50 pb-3">
              <div className="p-1.5 bg-violet-50 rounded-lg">
                <User className="h-3.5 w-3.5 text-violet-600" />
              </div>
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Creado por</h3>
            </div>
            {quote.user ? (
              <div className="flex items-center gap-3">
                <UserAvatar name={quote.user.name} size="md" />
                <div>
                  <p className="text-sm font-black text-gray-900">{quote.user.name}</p>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                    {new Date(quote.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400">Sin información</p>
            )}
          </div>

          {/* 3. Work Status (Operations) */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-6 border-b border-gray-50 pb-4">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Estado del Trabajo</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(statusLabels).map(([key, label]) => (
                <form key={key} action={updateQuoteStatus} className="w-full">
                  <input type="hidden" name="quoteId" value={quote.id} />
                  <input type="hidden" name="status" value={key} />
                  <StatusGridButton 
                    label={label} 
                    isActive={quote.status === key} 
                    colorClass={statusColors[key]} 
                  />
                </form>
              ))}
            </div>
          </div>

          {/* 4. Payment Control (Finance) */}
          <PaymentStatusForm 
            quoteId={quote.id} 
            currentStatus={quote.paymentStatus || "PENDING"} 
            currentAmount={quote.realAmountCollected || 0}
            totalAmount={quote.total}
          />

          {/* 5. Auditoría de Fórmulas */}
          <CalculationAudit 
            concepts={quote.concepts} 
            margin={Number(quote.subtotal > 0 ? (((quote.subtotal - quote.realCostTotal) / quote.subtotal) * 100).toFixed(0) : 35)} 
          />
        </div>
      </div>

    </div>
  );
}
