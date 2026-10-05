export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/prisma";
import { updateClient } from "../../actions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

interface EditClientPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditClientPage({ params }: EditClientPageProps) {
  const { id } = await params;
  
  const client = await prisma.client.findUnique({
    where: { id },
  });

  if (!client) {
    notFound();
  }

  const updateClientWithId = updateClient.bind(null, id);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center space-x-4">
        <Link
          href="/dashboard/clients"
          className="p-2 -ml-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Editar Cliente</h1>
      </div>

      <form action={updateClientWithId} className="bg-white shadow-sm border border-gray-100 rounded-lg p-6 space-y-6">
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Nombre o Razón Social *
            </label>
            <div className="mt-1">
              <input
                type="text"
                name="name"
                id="name"
                required
                defaultValue={client.name}
                className="shadow-sm focus:ring-red-500 focus:border-red-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 border px-3"
              />
            </div>
          </div>

          <div>
            <label htmlFor="company" className="block text-sm font-medium text-gray-700">
              Empresa
            </label>
            <div className="mt-1">
              <input
                type="text"
                name="company"
                id="company"
                defaultValue={client.company || ""}
                className="shadow-sm focus:ring-red-500 focus:border-red-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 border px-3"
              />
            </div>
          </div>

          <div>
            <label htmlFor="rfc" className="block text-sm font-medium text-gray-700">
              RFC
            </label>
            <div className="mt-1">
              <input
                type="text"
                name="rfc"
                id="rfc"
                defaultValue={client.rfc || ""}
                className="shadow-sm focus:ring-red-500 focus:border-red-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 border px-3"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Correo Electrónico
            </label>
            <div className="mt-1">
              <input
                type="email"
                name="email"
                id="email"
                defaultValue={client.email || ""}
                className="shadow-sm focus:ring-red-500 focus:border-red-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 border px-3"
              />
            </div>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Teléfono
            </label>
            <div className="mt-1">
              <input
                type="text"
                name="phone"
                id="phone"
                defaultValue={client.phone || ""}
                className="shadow-sm focus:ring-red-500 focus:border-red-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 border px-3"
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="address" className="block text-sm font-medium text-gray-700">
              Dirección
            </label>
            <div className="mt-1">
              <input
                type="text"
                name="address"
                id="address"
                defaultValue={client.address || ""}
                className="shadow-sm focus:ring-red-500 focus:border-red-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 border px-3"
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
              Notas Internas
            </label>
            <div className="mt-1">
              <textarea
                id="notes"
                name="notes"
                rows={3}
                defaultValue={client.notes || ""}
                className="shadow-sm focus:ring-red-500 focus:border-red-500 block w-full sm:text-sm border border-gray-300 rounded-md py-2 px-3"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200 flex justify-end space-x-3">
          <Link
            href="/dashboard/clients"
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Guardar Cambios
          </button>
        </div>
      </form>
    </div>
  );
}
