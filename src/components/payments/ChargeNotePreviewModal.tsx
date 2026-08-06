"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

export default function ChargeNotePreviewModal({
  isOpen,
  onClose,
  paymentRequest
}: {
  isOpen: boolean;
  onClose: () => void;
  paymentRequest: any;
}) {
  const [overrideClientName, setOverrideClientName] = useState(paymentRequest?.client?.name || "");
  const [overrideProjectName, setOverrideProjectName] = useState(paymentRequest?.quote?.project || "");
  const [overrideQuoteFolio, setOverrideQuoteFolio] = useState(paymentRequest?.quote?.folio || "");
  const [amountRequested, setAmountRequested] = useState<number>(paymentRequest?.amountRequested || 0);
  const [notes, setNotes] = useState(paymentRequest?.notes || "");

  // Update state when paymentRequest changes
  useEffect(() => {
    if (paymentRequest) {
      setOverrideClientName(paymentRequest.client?.name || "");
      setOverrideProjectName(paymentRequest.quote?.project || "");
      setOverrideQuoteFolio(paymentRequest.quote?.folio || "");
      setAmountRequested(paymentRequest.amountRequested || 0);
      setNotes(paymentRequest.notes || "");
    }
  }, [paymentRequest]);

  const handleDownload = () => {
    const params = new URLSearchParams({
      amount: amountRequested.toString(),
      notes: notes,
      clientName: overrideClientName,
      projectName: overrideProjectName,
      folio: overrideQuoteFolio,
      creatorName: paymentRequest?.createdBy?.name || "Administración"
    });

    const url = `/api/payments/preview/pdf?${params.toString()}`;
    window.open(url, "_blank");
    onClose();
  };

  if (!isOpen || !paymentRequest) return null;

  return (
    <div className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center p-4 z-50 pointer-events-none">
        <div className="mx-auto max-w-lg w-full rounded-lg bg-white shadow-xl pointer-events-auto flex flex-col max-h-full">
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Generar Nota de Cargo
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <div className="p-4 space-y-4 overflow-y-auto">
            <p className="text-sm text-gray-500">
              Puedes editar los siguientes campos solo para la visualización del PDF. Estos cambios no afectarán la base de datos.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700">Cliente a mostrar</label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                value={overrideClientName}
                onChange={(e) => setOverrideClientName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Proyecto</label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                value={overrideProjectName}
                onChange={(e) => setOverrideProjectName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Ref. Cotización / Folio</label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                value={overrideQuoteFolio}
                onChange={(e) => setOverrideQuoteFolio(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Monto (Total a Pagar)</label>
              <div className="relative mt-1 rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  className="block w-full rounded-md border border-gray-300 pl-7 p-2 focus:border-red-500 focus:ring-red-500 sm:text-sm"
                  value={amountRequested}
                  onChange={(e) => setAmountRequested(parseFloat(e.target.value))}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Descripción del Cargo</label>
              <textarea
                rows={3}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="border-t bg-gray-50 p-4 flex justify-end space-x-3 rounded-b-lg shrink-0">
            <button
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none"
            >
              Cancelar
            </button>
            <button
              onClick={handleDownload}
              className="inline-flex justify-center rounded-md border border-transparent bg-red-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none"
            >
              Generar PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
