"use client";

import { useState, useRef } from "react";
import { Trash2 } from "lucide-react";
import SubmitButton from "@/components/ui/SubmitButton";
import { deleteQuote } from "@/server/actions/quote.actions";
import ConfirmationModal from "@/components/ui/ConfirmationModal";

interface DeleteQuoteButtonProps {
  quoteId: string;
}

export default function DeleteQuoteButton({ quoteId }: DeleteQuoteButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);

  const handleConfirm = async () => {
    setIsDeleting(true);
    setTimeout(() => {
      submitBtnRef.current?.click();
    }, 50);
    // No reseteamos isDeleting porque se redirigirá la página
  };

  return (
    <>
      <form ref={formRef} action={deleteQuote}>
        <input type="hidden" name="quoteId" value={quoteId} />
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center text-red-600 border border-red-100 hover:bg-red-50 px-4 py-2 text-sm font-semibold rounded-lg shadow-sm transition-colors"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Borrar
        </button>
        <button type="submit" ref={submitBtnRef} className="hidden" />
      </form>

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
