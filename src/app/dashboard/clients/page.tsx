export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, Users, Mail, Phone, Briefcase, ChevronRight } from "lucide-react";
import ClientsListClient from "@/components/clients/ClientsListClient";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const { search } = await searchParams;

  const clients = await prisma.client.findMany({
    where: {
      active: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-red-600" />
            CLIENTES
          </h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
            Directorio de clientes y prospectos de Laser Inova
          </p>
        </div>
        
        <Link
          href="/dashboard/clients/new"
          className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-red-600/20 text-white bg-red-600 hover:bg-red-700 transition-all active:scale-95"
        >
          <Plus className="-ml-1 mr-2 h-4 w-4" aria-hidden="true" />
          Nuevo Cliente
        </Link>
      </div>

      <ClientsListClient initialClients={clients} />
    </div>
  );
}
