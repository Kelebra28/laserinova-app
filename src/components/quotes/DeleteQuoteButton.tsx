"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteQuoteAction } from "@/server/actions/quote.actions";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

interface DeleteQuoteButtonProps {
  quoteId: string;
}

export default function DeleteQuoteButton({ quoteId }: DeleteQuoteButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      const res = await deleteQuoteAction(quoteId);
      if (res.success) {
        toast.success("Cotización eliminada correctamente");
        setIsModalOpen(false);
        router.replace("/dashboard/quotes");
      } else {
        toast.error(res.error || "Error al eliminar la cotización");
        setIsDeleting(false);
      }
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar la cotización");
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="inline-flex items-center text-red-600 border border-red-100 hover:bg-red-50 px-4 py-2 text-sm font-semibold rounded-lg shadow-sm transition-colors"
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Borrar
      </button>

      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirm}
        isLoading={isDeleting}
        title="Eliminar Cotización"
        message="¿Estás seguro de que deseas borrar esta cotización? Esta acción es permanente y no se podrá recuperar la información."
        confirmText="Sí, Eliminar"
        cancelText="Cancelar"
        variant="danger"
      />
    </>
  );
}
