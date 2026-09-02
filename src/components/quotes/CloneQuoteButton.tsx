"use client";

import { useState } from "react";
import { Copy, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import ClientSelector from "@/components/quotes/ClientSelector";
import { cloneQuoteAction } from "@/server/actions/quote.actions";

interface CloneQuoteButtonProps {
  quoteId: string;
  clients: any[];
}

export default function CloneQuoteButton({ quoteId, clients }: CloneQuoteButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [clientId, setClientId] = useState("");
  const [prospectName, setProspectName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(false);
    setErrorMsg("");

    const formData = new FormData(e.currentTarget);
    const selectedClientId = (formData.get("clientId") as string) || null;
    const selectedProspectName = (formData.get("prospectName") as string) || null;
    const shouldSaveAsClient = formData.get("saveAsClient") === "true";

    if (!selectedClientId && !selectedProspectName) {
      setErrorMsg("Debes seleccionar un cliente o escribir un prospecto.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await cloneQuoteAction(
        quoteId,
        selectedClientId,
        selectedProspectName,
        shouldSaveAsClient
      );

      if (result.success) {
        setIsOpen(false);
        router.push(`/dashboard/quotes/${result.quoteId}`);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Ocurrió un error al copiar la cotización.");
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setClientId("");
          setProspectName("");
          setErrorMsg("");
          setIsOpen(true);
        }}
        className="inline-flex items-center px-4 py-2 text-gray-600 text-xs font-bold rounded-lg hover:bg-white hover:text-red-600 transition-all active:scale-95"
      >
        <Copy className="mr-2 h-4 w-4" />
        Crear Copia
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => !isLoading && setIsOpen(false)}
          />

          {/* Modal Content */}
          <form
            onSubmit={handleFormSubmit}
            className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-visible transform transition-all animate-in zoom-in-95 duration-200"
          >
            <div className="p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                    Crear Copia de Cotización
                  </h3>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                    Selecciona el cliente de destino para la copia
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => !isLoading && setIsOpen(false)}
                  disabled={isLoading}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-50 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-600 uppercase tracking-wider">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-6">
                <div className="relative min-h-[140px]">
                  <ClientSelector
                    clients={clients}
                    value={clientId}
                    onChange={(id) => {
                      setClientId(id);
                      setProspectName("");
                      setErrorMsg("");
                    }}
                    onProspectNameChange={(name) => {
                      setProspectName(name);
                      setClientId("");
                      setErrorMsg("");
                    }}
                    prospectName={prospectName}
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50/50 p-6 flex flex-col sm:flex-row-reverse gap-3 rounded-b-3xl border-t border-gray-100">
              <button
                type="submit"
                disabled={isLoading || (!clientId && !prospectName)}
                className="flex-1 py-3.5 px-6 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-200 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100 disabled:shadow-none"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Copiando...
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Confirmar Copia
                  </>
                )}
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => setIsOpen(false)}
                className="flex-1 py-3.5 px-6 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:bg-gray-100 transition-all border border-gray-100 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
