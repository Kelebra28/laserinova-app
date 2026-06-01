"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Loader2, Save, Info } from "lucide-react";
import { ProviderInput, ProviderContactInput } from "@/app/dashboard/providers/actions";

interface ProviderDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ProviderInput) => Promise<void>;
  provider?: any; // If editing, provider data
  isSaving: boolean;
}

export default function ProviderDrawer({
  isOpen,
  onClose,
  onSave,
  provider,
  isSaving,
}: ProviderDrawerProps) {
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [portalUsername, setPortalUsername] = useState("");
  const [portalPassword, setPortalPassword] = useState("");
  const [contacts, setContacts] = useState<ProviderContactInput[]>([
    { name: "", phone: "", email: "" },
  ]);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (provider) {
        setCompanyName(provider.companyName || "");
        setAddress(provider.address || "");
        setWebsite(provider.website || "");
        setPortalUsername(provider.portalUsername || "");
        setPortalPassword(""); // Keep blank unless updating
        setContacts(
          provider.contacts?.length > 0
            ? provider.contacts.map((c: any) => ({
                name: c.name || "",
                phone: c.phone || "",
                email: c.email || ""
              }))
            : [{ name: "", phone: "", email: "" }]
        );
      } else {
        // Reset for new creation
        setCompanyName("");
        setAddress("");
        setWebsite("");
        setPortalUsername("");
        setPortalPassword("");
        setContacts([{ name: "", phone: "", email: "" }]);
      }
      setErrorMsg("");
    }
  }, [isOpen, provider]);

  if (!isOpen) return null;

  const handleAddContact = () => {
    setContacts([...contacts, { name: "", phone: "", email: "" }]);
  };

  const handleRemoveContact = (index: number) => {
    setContacts(contacts.filter((_, idx) => idx !== index));
  };

  const handleContactChange = (index: number, field: keyof ProviderContactInput, val: string) => {
    setContacts(
      contacts.map((c, idx) => (idx === index ? { ...c, [field]: val } : c))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!companyName.trim()) {
      setErrorMsg("El nombre de la empresa es obligatorio.");
      return;
    }

    // Validate contacts
    const filteredContacts = contacts.filter((c) => c.name.trim() !== "");
    if (filteredContacts.length === 0) {
      setErrorMsg("Debes agregar al menos un vendedor/contacto con nombre.");
      return;
    }

    await onSave({
      companyName,
      address,
      website,
      portalUsername,
      portalPassword: portalPassword || undefined,
      contacts: filteredContacts,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Click outside backdrop to close */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />

      {/* Drawer Body */}
      <div className="w-full max-w-xl bg-white h-full shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] border-l border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 flex-shrink-0 bg-slate-900 text-white">
          <div>
            <h3 className="font-black text-sm uppercase tracking-wider">
              {provider ? "Editar Proveedor" : "Registrar Proveedor"}
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
              {provider ? provider.companyName : "Nuevo Proveedor del CRM"}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-1.5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs font-bold text-red-600 flex items-start gap-2">
              <Info className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Datos Generales */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
              Información de la Empresa
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-full space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Nombre de la Empresa *</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-red-500 focus:bg-white px-3.5 py-2.5 rounded-xl text-xs text-slate-800 font-semibold outline-none transition-all"
                  placeholder="Ej. AceroLaser S.A."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Sitio Web</label>
                <input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-red-500 focus:bg-white px-3.5 py-2.5 rounded-xl text-xs text-slate-850 outline-none transition-all"
                  placeholder="www.proveedor.com"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Dirección Física</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-red-500 focus:bg-white px-3.5 py-2.5 rounded-xl text-xs text-slate-850 outline-none transition-all"
                  placeholder="Ciudad de México, Centro"
                />
              </div>
            </div>
          </div>

          {/* Credenciales de Acceso */}
          <div className="space-y-4">
            <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Credenciales de su Portal Web (Seguras)
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Usuario / Correo del Portal</label>
                <input
                  type="text"
                  value={portalUsername}
                  onChange={(e) => setPortalUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-red-500 focus:bg-white px-3.5 py-2.5 rounded-xl text-xs text-slate-800 outline-none transition-all"
                  placeholder="ejemplo@correo.com"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  {provider ? "Nueva Contraseña (Opcional)" : "Contraseña del Portal"}
                </label>
                <input
                  type="password"
                  value={portalPassword}
                  onChange={(e) => setPortalPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-red-500 focus:bg-white px-3.5 py-2.5 rounded-xl text-xs text-slate-800 outline-none transition-all"
                  placeholder={provider ? "Dejar en blanco para conservar" : "Contraseña del sitio"}
                />
              </div>
            </div>
          </div>

          {/* Lista de Vendedores */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Vendedores / Contactos de Atención
              </h4>
              <button
                type="button"
                onClick={handleAddContact}
                className="flex items-center gap-1 text-[9px] font-black text-red-600 uppercase tracking-widest hover:text-red-700 bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar Vendedor
              </button>
            </div>

            <div className="space-y-3.5">
              {contacts.map((contact, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-slate-50/50 border border-slate-250/60 rounded-2xl flex flex-col gap-3.5 relative hover:border-red-100 hover:bg-white transition-all group"
                >
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {contacts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveContact(idx)}
                        className="p-1 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar este contacto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Nombre Completo *</label>
                      <input
                        type="text"
                        required
                        value={contact.name}
                        onChange={(e) => handleContactChange(idx, "name", e.target.value)}
                        className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-red-500 px-3 py-2 rounded-lg text-xs text-slate-800 font-semibold outline-none transition-all"
                        placeholder="Ej. Ing. Ricardo Gomez"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Teléfono / WhatsApp</label>
                      <input
                        type="tel"
                        value={contact.phone || ""}
                        onChange={(e) => handleContactChange(idx, "phone", e.target.value)}
                        className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-red-500 px-3 py-2 rounded-lg text-xs text-slate-800 outline-none transition-all"
                        placeholder="+52 55..."
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Correo Electrónico</label>
                      <input
                        type="email"
                        value={contact.email || ""}
                        onChange={(e) => handleContactChange(idx, "email", e.target.value)}
                        className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-red-500 px-3 py-2 rounded-lg text-xs text-slate-800 outline-none transition-all"
                        placeholder="ventas@proveedor.com"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-200 rounded-xl transition-all disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md transition-all disabled:opacity-50 active:scale-95"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Guardar Proveedor
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
