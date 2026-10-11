"use client";

import { useState } from "react";
import { Loader2, ChevronRight, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { UserAvatar } from "@/components/ui/UserAvatar";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import { deleteQuoteAction } from "@/server/actions/quote.actions";
import { toast } from "react-hot-toast";

interface QuoteRowProps {
  quote: any;
  statusColors: Record<string, string>;
  statusLabels: Record<string, string>;
  onDeleted?: () => void;
}

export default function QuoteRow({ quote, statusColors, statusLabels, onDeleted }: QuoteRowProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleNavigate = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      isDeleteModalOpen || 
      isDeleting || 
      target.closest('button') || 
      target.closest('[role="dialog"]')
    ) {
      return;
    }
    setIsLoading(true);
    router.push(`/dashboard/quotes/${quote.id}`);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await deleteQuoteAction(quote.id);
      if (res.success) {
        toast.success(`Cotización ${quote.folio} eliminada`);
        setIsDeleteModalOpen(false);
        onDeleted?.();
      } else {
        toast.error(res.error || "Error al eliminar cotización");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar cotización");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <tr
      onClick={handleNavigate}
      className={`hover:bg-gray-50 transition-colors cursor-pointer group ${isLoading ? "opacity-60 pointer-events-none" : ""}`}
    >
      {/* Folio */}
      <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-red-600">
        <div className="flex items-center gap-2">
          {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
          {quote.folio}
        </div>
      </td>

      {/* Cliente */}
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
        {quote.client?.name || quote.prospectName || "Sin cliente"}
      </td>

      {/* Proyecto */}
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
        {quote.project}
      </td>

      {/* Total */}
      <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-gray-900">
        ${quote.total.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </td>

      {/* Estatus */}
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-3 py-1 inline-flex text-[10px] font-black uppercase tracking-wider rounded-full ${statusColors[quote.status]}`}>
          {statusLabels[quote.status]}
        </span>
      </td>

      {/* Fecha */}
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
        {new Date(quote.createdAt).toLocaleDateString("es-MX")}
      </td>

      {/* Creado por — Ahora con RI/RA y colores fijos */}
      <td className="px-6 py-4 whitespace-nowrap">
        {quote.user ? (
          <div className="flex items-center gap-2">
            <UserAvatar name={quote.user.name} size="xs" />
            <span className="text-xs font-bold text-gray-600 hidden sm:block">
              {quote.user.name.split(" ")[0]}
            </span>
          </div>
        ) : (
          <span className="text-[10px] text-gray-300 font-bold">—</span>
        )}
      </td>

      {/* Acciones */}
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            data-testid={`delete-quote-${quote.folio}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDeleteModalOpen(true);
            }}
            title="Eliminar cotización"
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <div className="text-gray-300 group-hover:text-red-600 transition-colors">
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ChevronRight className="h-5 w-5" />}
          </div>
        </div>

        <div onClick={(e) => e.stopPropagation()}>
          <ConfirmationModal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            onConfirm={handleDelete}
            isLoading={isDeleting}
            title="Eliminar Cotización"
            message={`¿Estás seguro de que deseas eliminar permanentemente la cotización ${quote.folio} (${quote.project || 'Sin proyecto'})? Esta acción no se puede deshacer.`}
            confirmText="Sí, Eliminar"
            cancelText="Cancelar"
            variant="danger"
          />
        </div>
      </td>
    </tr>
  );
}
