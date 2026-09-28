"use client";

import { useState, useMemo } from "react";
import SearchInput from "@/components/ui/SearchInput";
import { Users, Mail, Phone, Briefcase } from "lucide-react";
import ClientActions from "@/components/clients/ClientActions";

interface Client {
  id: string;
  name: string;
  company: string | null;
  rfc: string | null;
  email: string | null;
  phone: string | null;
}

interface ClientsListClientProps {
  initialClients: Client[];
}

export default function ClientsListClient({ initialClients }: ClientsListClientProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredClients = useMemo(() => {
    if (!searchTerm) return initialClients;
    const lower = searchTerm.toLowerCase();
    return initialClients.filter((client) => 
      (client.name && client.name.toLowerCase().includes(lower)) ||
      (client.company && client.company.toLowerCase().includes(lower)) ||
      (client.rfc && client.rfc.toLowerCase().includes(lower)) ||
      (client.email && client.email.toLowerCase().includes(lower))
    );
  }, [initialClients, searchTerm]);

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 relative">
      <div className="px-6 py-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
        <div className="w-full max-w-md">
          <SearchInput 
            placeholder="Buscar por nombre, empresa o RFC..." 
            value={searchTerm}
            onChange={setSearchTerm}
          />
        </div>
      </div>

      <ul role="list" className="divide-y divide-gray-50">
        {filteredClients.length === 0 ? (
          <li className="px-6 py-20 text-center">
            <Users className="h-8 w-8 text-gray-200 mx-auto mb-3" />
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">No se encontraron clientes</p>
          </li>
        ) : (
          filteredClients.map((client) => (
            <li key={client.id} className="group hover:bg-gray-50/50 transition-colors">
              <div className="px-6 py-5 flex items-center justify-between">
                <div className="flex-1 min-w-0 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-600 font-black text-lg shrink-0 border border-red-100 group-hover:scale-105 transition-transform">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-black text-gray-900 group-hover:text-red-600 transition-colors">
                        {client.name}
                      </p>
                      {client.company && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-tight">
                          <Briefcase className="h-3 w-3" />
                          {client.company}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                      {client.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {client.email}
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {client.phone}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <ClientActions clientId={client.id} clientName={client.name} />
                </div>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
