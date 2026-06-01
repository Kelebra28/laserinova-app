"use client";

import React, { useState } from "react";
import { 
  Building2, Search, Plus, Globe, MapPin, Mail, 
  Phone, Key, Trash2, Edit3, MessageCircle, AlertCircle 
} from "lucide-react";
import { ProviderInput, createProviderAction, updateProviderAction, deleteProviderAction } from "@/app/dashboard/providers/actions";
import ProviderDrawer from "./ProviderDrawer";
import CredentialViewer from "./CredentialViewer";

interface ProvidersClientProps {
  initialProviders: any[];
}

export default function ProvidersClient({ initialProviders }: ProvidersClientProps) {
  const [providers, setProviders] = useState<any[]>(initialProviders);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<any | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  // Filter providers in real-time
  const filteredProviders = providers.filter((p) => {
    const matchesCompany = p.companyName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesContacts = p.contacts?.some((c: any) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone?.includes(searchQuery) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return matchesCompany || matchesContacts;
  });

  const handleOpenCreate = () => {
    setSelectedProvider(undefined);
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (provider: any) => {
    setSelectedProvider(provider);
    setIsDrawerOpen(true);
  };

  const handleSave = async (data: ProviderInput) => {
    setIsSaving(true);
    try {
      if (selectedProvider) {
        // Edit Mode
        const res = await updateProviderAction(selectedProvider.id, data);
        if (res.success && res.provider) {
          setProviders(
            providers.map((p) => (p.id === selectedProvider.id ? res.provider : p))
          );
          setIsDrawerOpen(false);
        }
      } else {
        // Create Mode
        const res = await createProviderAction(data);
        if (res.success && res.provider) {
          setProviders([res.provider, ...providers]);
          setIsDrawerOpen(false);
        }
      }
    } catch (err) {
      console.error(err);
      alert("Hubo un error al guardar los datos del proveedor.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar al proveedor "${name}"?`)) {
      return;
    }

    try {
      const res = await deleteProviderAction(id);
      if (res.success) {
        setProviders(providers.filter((p) => p.id !== id));
      }
    } catch (err) {
      console.error(err);
      alert("No se pudo eliminar al proveedor.");
    }
  };

  // Helper to format WhatsApp API links
  const getWhatsAppLink = (phone: string, contactName: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const message = `Hola ${contactName}, te escribo de parte de Laser Inova para consultar sobre un pedido / cotización.`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      
      {/* Header and Add button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Building2 className="h-6.5 w-6.5 text-red-600" />
            DIRECTORIO DE PROVEEDORES
          </h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
            Gestión segura de portales, cotizaciones y contactos clave
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-red-600/15 hover:shadow-red-700/25 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4.5 h-4.5" />
          Registrar Proveedor
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-250 flex items-center gap-3">
        <Search className="w-5 h-5 text-gray-400 ml-2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por empresa, nombre del vendedor, teléfono o correo..."
          className="flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder-gray-400 font-medium"
        />
      </div>

      {/* Grid List */}
      {filteredProviders.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 flex flex-col items-center justify-center space-y-4">
          <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 stroke-[1.5]" />
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Sin Proveedores</h3>
            <p className="text-xs text-slate-400 mt-1 font-medium max-w-sm mx-auto">
              {searchQuery 
                ? "No encontramos proveedores que coincidan con tu búsqueda en el directorio." 
                : "Aún no has registrado ningún proveedor en el CRM. Registra el primero para comenzar."}
            </p>
          </div>
          {!searchQuery && (
            <button
              onClick={handleOpenCreate}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-750 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
            >
              Registrar Primer Proveedor
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProviders.map((provider) => (
            <div
              key={provider.id}
              className="bg-white rounded-3xl border border-gray-200 shadow-sm hover:shadow-md hover:border-red-300 p-6 flex flex-col justify-between transition-all group overflow-hidden"
            >
              <div>
                {/* Provider Card Top Bar */}
                <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-3.5 mb-4">
                  <div className="min-w-0">
                    <h3 className="font-black text-sm text-gray-800 leading-tight uppercase truncate">
                      {provider.companyName}
                    </h3>
                    
                    {provider.website && (
                      <a
                        href={provider.website.startsWith("http") ? provider.website : `https://${provider.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[10px] font-black text-red-600 hover:text-red-700 uppercase tracking-widest mt-1.5 hover:underline transition-colors"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        Visitar Web
                      </a>
                    )}
                  </div>

                  {/* Edit/Delete Actions */}
                  <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenEdit(provider)}
                      className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-700 rounded-lg transition-all"
                      title="Editar proveedor"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(provider.id, provider.companyName)}
                      className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-all"
                      title="Eliminar proveedor"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Info Fields */}
                <div className="space-y-3.5 text-xs text-gray-500 font-medium mb-5">
                  {provider.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <span className="leading-tight text-slate-600">{provider.address}</span>
                    </div>
                  )}

                  {/* Portal Credentials Section */}
                  {(provider.portalUsername || provider.portalPasswordEncrypted) && (
                    <div className="p-3 bg-slate-50/50 border border-slate-200/80 rounded-2xl space-y-2">
                      <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        <Key className="w-3.5 h-3.5" /> Acceso al Portal
                      </div>
                      
                      {provider.portalUsername && (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Usuario/Correo</span>
                          <span className="font-bold text-slate-700 break-all select-all">{provider.portalUsername}</span>
                        </div>
                      )}
                      
                      {provider.portalPasswordEncrypted && (
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Contraseña</span>
                          <CredentialViewer encryptedValue={provider.portalPasswordEncrypted} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Vendedores List Section */}
              <div className="border-t border-gray-100 pt-4 mt-auto">
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3.5">
                  Contactos de Atención
                </h4>

                <div className="space-y-3">
                  {provider.contacts?.map((contact: any) => (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between p-2.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-200/50 rounded-xl transition-all"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-bold text-slate-800 truncate leading-tight">
                          {contact.name}
                        </p>
                        {contact.email && (
                          <p className="text-[10px] text-slate-400 truncate mt-0.5 select-all">
                            {contact.email}
                          </p>
                        )}
                      </div>

                      {/* Communications Action Buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        {contact.phone && (
                          <>
                            {/* Call button */}
                            <a
                              href={`tel:${contact.phone}`}
                              className="p-2 bg-white text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:shadow-sm transition-all"
                              title={`Llamar a ${contact.name}`}
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                            {/* WhatsApp button */}
                            <a
                              href={getWhatsAppLink(contact.phone, contact.name)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 bg-emerald-50 text-emerald-600 hover:text-emerald-700 border border-emerald-100 rounded-lg hover:shadow-sm transition-all"
                              title={`Escribir por WhatsApp`}
                            >
                              <MessageCircle className="w-3.5 h-3.5 fill-emerald-600/10" />
                            </a>
                          </>
                        )}
                        {contact.email && (
                          <a
                            href={`mailto:${contact.email}`}
                            className="p-2 bg-white text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:shadow-sm transition-all"
                            title={`Enviar correo a ${contact.email}`}
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drawer slide-over */}
      <ProviderDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSave={handleSave}
        provider={selectedProvider}
        isSaving={isSaving}
      />
    </div>
  );
}
