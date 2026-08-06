"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { getPendingQuotesByClient, createPaymentRequest } from "@/app/actions/paymentRequests";

export default function PaymentRequestForm({ clients, onSuccess, onCancel }: { clients: any[], onSuccess: () => void, onCancel: () => void }) {
  const { data: session } = useSession();
  
  const [clientId, setClientId] = useState("");
  const [quoteId, setQuoteId] = useState("");
  const [selectedConcepts, setSelectedConcepts] = useState<string[]>([]);
  const [amountRequested, setAmountRequested] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!clientId) {
      setQuotes([]);
      setQuoteId("");
      setSelectedConcepts([]);
      setAmountRequested("");
      setNotes("");
      return;
    }

    const fetchQuotes = async () => {
      setLoadingQuotes(true);
      const res = await getPendingQuotesByClient(clientId);
      if (res.success && res.quotes) {
        setQuotes(res.quotes);
      } else {
        setQuotes([]);
      }
      setLoadingQuotes(false);
      setQuoteId("");
      setSelectedConcepts([]);
      setAmountRequested("");
      setNotes("");
    };

    fetchQuotes();
  }, [clientId]);

  useEffect(() => {
    if (quoteId) {
      const selected = quotes.find(q => q.id === quoteId);
      if (selected) {
        if (selectedConcepts.length > 0) {
          const sum = selected.concepts
            .filter((c: any) => selectedConcepts.includes(c.id))
            .reduce((acc: number, c: any) => acc + (c.totalAmount || 0), 0);
          setAmountRequested(sum);
          const descriptions = selected.concepts
            .filter((c: any) => selectedConcepts.includes(c.id))
            .map((c: any) => c.description || c.conceptType)
            .join(", ");
          setNotes(`Cobro por: ${descriptions}`);
        } else {
          const balance = selected.total - (selected.realAmountCollected || 0);
          setAmountRequested(balance > 0 ? balance : 0);
          setNotes("");
        }
      }
    } else {
      setAmountRequested("");
      setSelectedConcepts([]);
      setNotes("");
    }
  }, [quoteId, quotes, selectedConcepts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !quoteId || !amountRequested) {
      setError("Por favor completa los campos requeridos.");
      return;
    }
    
    if (!session?.user?.id) {
      setError("No se pudo obtener el usuario actual.");
      return;
    }

    setSubmitting(true);
    setError("");

    const res = await createPaymentRequest({
      clientId,
      quoteId,
      amountRequested: Number(amountRequested),
      notes,
      createdById: session.user.id
    });

    if (res.success) {
      onSuccess();
    } else {
      setError(res.error || "Ocurrió un error al crear la solicitud.");
    }
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-red-500 text-sm font-medium">{error}</div>}

      <div>
        <label className="block text-sm font-medium text-gray-700">Cliente</label>
        <select 
          className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-red-500 focus:ring-red-500"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          required
        >
          <option value="">Selecciona un cliente...</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ""}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Cotización / Proyecto</label>
        <select 
          className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-red-500 focus:ring-red-500 disabled:bg-gray-100"
          value={quoteId}
          onChange={(e) => {
            setQuoteId(e.target.value);
            setSelectedConcepts([]);
          }}
          disabled={!clientId || loadingQuotes}
          required
        >
          <option value="">{loadingQuotes ? "Cargando..." : "Selecciona una cotización..."}</option>
          {quotes.map(q => {
            const balance = q.total - (q.realAmountCollected || 0);
            const statusText = balance <= 0 ? "PAGADO" : `Pendiente: $${balance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
            return (
              <option key={q.id} value={q.id}>
                {q.folio} - {q.project} ({statusText})
              </option>
            );
          })}
        </select>
        {clientId && !loadingQuotes && quotes.length === 0 && (
          <p className="text-xs text-gray-500 mt-1">Este cliente no tiene cotizaciones.</p>
        )}
        
        {quoteId && quotes.find(q => q.id === quoteId)?.concepts?.length > 0 && (
          <div className="mt-4 p-4 border rounded-md bg-gray-50 shadow-inner">
            <h4 className="text-sm font-semibold mb-3 text-gray-900">Cobrar conceptos específicos (opcional):</h4>
            <div className="space-y-2">
              {quotes.find(q => q.id === quoteId)?.concepts.map((c: any) => (
                <label key={c.id} className="flex items-start space-x-3 text-sm cursor-pointer p-2 hover:bg-white rounded border border-transparent hover:border-gray-200 transition-colors">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                    checked={selectedConcepts.includes(c.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedConcepts([...selectedConcepts, c.id]);
                      } else {
                        setSelectedConcepts(selectedConcepts.filter(id => id !== c.id));
                      }
                    }}
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">
                      {c.conceptType} <span className="font-normal text-gray-600 ml-1">- {c.description}</span>
                    </div>
                    <div className="mt-1 text-gray-900 font-bold tracking-tight">
                      ${(c.totalAmount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Monto a Solicitar</label>
        <div className="relative mt-1 rounded-md shadow-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <span className="text-gray-500 sm:text-sm">$</span>
          </div>
          <input
            type="number"
            step="0.01"
            min="0.01"
            className="block w-full rounded-md border border-gray-300 pl-7 p-2 focus:border-red-500 focus:ring-red-500 sm:text-sm"
            value={amountRequested}
            onChange={(e) => setAmountRequested(parseFloat(e.target.value))}
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Notas / Detalles del Cobro</label>
        <textarea
          rows={3}
          className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ej. Anticipo del 50%..."
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex justify-center rounded-md border border-transparent bg-red-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none disabled:opacity-50"
        >
          {submitting ? "Guardando..." : "Crear Solicitud"}
        </button>
      </div>
    </form>
  );
}
