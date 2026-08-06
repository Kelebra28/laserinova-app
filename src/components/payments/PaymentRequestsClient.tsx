"use client";

import { useState } from "react";
import { Plus, FileDown, Trash2, Pencil } from "lucide-react";
import PaymentRequestForm from "./PaymentRequestForm";
import ChargeNotePreviewModal from "./ChargeNotePreviewModal";
import { updatePaymentRequestStatus, deletePaymentRequest, updatePaymentRequest } from "@/app/actions/paymentRequests";
import toast from "react-hot-toast";

export default function PaymentRequestsClient({
  initialRequests,
  clients
}: {
  initialRequests: any[];
  clients: any[];
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editAmount, setEditAmount] = useState<number | "">("");
  const [editNotes, setEditNotes] = useState("");

  const handleStatusChange = async (id: string, newStatus: string) => {
    const res = await updatePaymentRequestStatus(id, newStatus);
    if (res.success) {
      setRequests(requests.map(r => r.id === id ? { ...r, status: newStatus } : r));
      toast.success("Estatus actualizado");
    } else {
      toast.error("Error: " + res.error);
    }
  };

  const handleOpenPreview = (req: any) => {
    setSelectedRequest(req);
    setPreviewModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar esta solicitud de pago? Esta acción afectará los saldos pendientes si ya estaba pagada.")) {
      const res = await deletePaymentRequest(id);
      if (res.success) {
        setRequests(requests.filter(r => r.id !== id));
        toast.success("Solicitud eliminada");
      } else {
        toast.error("Error al eliminar: " + res.error);
      }
    }
  };

  const handleOpenEdit = (req: any) => {
    setSelectedRequest(req);
    setEditAmount(req.amountRequested);
    setEditNotes(req.notes || "");
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedRequest || editAmount === "") return;
    const res = await updatePaymentRequest(selectedRequest.id, {
      amountRequested: Number(editAmount),
      notes: editNotes
    });
    if (res.success) {
      setRequests(requests.map(r => r.id === selectedRequest.id ? { ...r, amountRequested: Number(editAmount), notes: editNotes } : r));
      setIsEditModalOpen(false);
      toast.success("Solicitud actualizada");
    } else {
      toast.error("Error al actualizar: " + res.error);
    }
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    // Reload to get the newest requests and updated balances
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Solicitudes de Pago (Cobranza)
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Gestiona los cobros pendientes, crea notas de cargo y haz seguimiento del estatus.
          </p>
        </div>
        <div className="mt-4 sm:ml-4 sm:mt-0">
          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
          >
            <Plus className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
            Nueva Solicitud
          </button>
        </div>
      </div>

      {isFormOpen && (
        <div className="bg-white shadow sm:rounded-lg mb-8 border border-gray-200">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-base font-semibold leading-6 text-gray-900 mb-4">
              Crear Nueva Solicitud de Pago
            </h3>
            <PaymentRequestForm 
              clients={clients} 
              onSuccess={handleFormSuccess} 
              onCancel={() => setIsFormOpen(false)} 
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white shadow sm:rounded-lg overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Folio / Proyecto</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Cliente</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Monto</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Estatus</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Fecha</th>
                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {requests.map((req) => (
                <tr key={req.id}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                    {req.quote?.folio || 'N/A'}
                    <div className="text-xs text-gray-500 font-normal">{req.quote?.project}</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {req.client?.name}
                    {req.client?.company && <div className="text-xs text-gray-400">{req.client.company}</div>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 font-medium">
                    ${req.amountRequested.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    <select
                      className={`text-xs rounded-full px-2.5 py-1 font-semibold ${
                        req.status === 'PAID' ? 'bg-green-100 text-green-800' :
                        req.status === 'CANCELLED' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}
                      value={req.status}
                      onChange={(e) => handleStatusChange(req.id, e.target.value)}
                    >
                      <option value="PENDING">PENDIENTE</option>
                      <option value="PAID">PAGADO</option>
                      <option value="CANCELLED">CANCELADO</option>
                    </select>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {new Date(req.createdAt).toLocaleDateString('es-MX')}
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <button
                      onClick={() => handleOpenEdit(req)}
                      className="text-indigo-600 hover:text-indigo-900 inline-flex items-center mr-3"
                      title="Editar Solicitud"
                    >
                      <Pencil className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleOpenPreview(req)}
                      className="text-red-600 hover:text-red-900 inline-flex items-center mr-3"
                      title="Generar Nota de Cargo PDF"
                    >
                      <FileDown className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(req.id)}
                      className="text-gray-400 hover:text-red-600 inline-flex items-center"
                      title="Eliminar Solicitud"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-gray-500">
                    No hay solicitudes de pago creadas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ChargeNotePreviewModal 
        isOpen={previewModalOpen} 
        onClose={() => setPreviewModalOpen(false)} 
        paymentRequest={selectedRequest} 
      />

      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Editar Solicitud de Pago</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Monto a Solicitar</label>
                <div className="relative mt-1 rounded-md shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    className="mt-1 block w-full rounded-md border border-gray-300 pl-7 p-2 focus:border-red-500 focus:ring-red-500 sm:text-sm"
                    value={editAmount}
                    onChange={(e) => setEditAmount(parseFloat(e.target.value))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Notas / Detalles</label>
                <textarea
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:border-red-500 focus:ring-red-500 sm:text-sm"
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
