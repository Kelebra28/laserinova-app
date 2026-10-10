"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, Check, UserPlus, X } from "lucide-react";

interface ClientSelectorProps {
  clients: any[];
  value: string;
  onChange: (id: string) => void;
  onProspectNameChange?: (name: string) => void;
  prospectName?: string;
  disabled?: boolean;
  saveAsClient?: boolean;
  onSaveAsClientChange?: (save: boolean) => void;
}

export default function ClientSelector({
  clients,
  value,
  onChange,
  onProspectNameChange,
  prospectName = "",
  disabled,
  saveAsClient: externalSaveAsClient,
  onSaveAsClientChange,
}: ClientSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [mode, setMode] = useState<"select" | "prospect">(
    prospectName && !value ? "prospect" : "select"
  );
  const [localProspect, setLocalProspect] = useState(prospectName);
  const [internalSaveAsClient, setInternalSaveAsClient] = useState(false);
  const saveAsClient = externalSaveAsClient !== undefined ? externalSaveAsClient : internalSaveAsClient;
  const setSaveAsClient = onSaveAsClientChange || setInternalSaveAsClient;
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      return (
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.company && c.company.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    });
  }, [clients, searchTerm]);

  useEffect(() => {
    if (prospectName && prospectName !== localProspect) {
      setLocalProspect(prospectName);
      if (!value) {
        setMode("prospect");
      }
    }
  }, [prospectName, value]);

  const selectedClient = clients.find((c) => c.id === value);

  const switchToProspect = () => {
    onChange("");
    setMode("prospect");
    setIsOpen(false);
  };

  const switchToClient = () => {
    setLocalProspect("");
    setSaveAsClient(false);
    onProspectNameChange?.("");
    setMode("select");
  };

  if (mode === "prospect") {
    return (
      <div ref={wrapperRef} className="relative w-full">
        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Cliente / Prospecto *</label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={localProspect}
              onChange={(e) => {
                setLocalProspect(e.target.value);
                onProspectNameChange?.(e.target.value);
              }}
              placeholder="Nombre del prospecto o empresa..."
              className="w-full text-sm font-medium border-orange-200 rounded-xl py-3 px-4 bg-orange-50/30 text-gray-900 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 focus:bg-white transition-all outline-none"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <button
                type="button"
                onClick={switchToClient}
                className="p-1.5 text-orange-400 hover:text-orange-600 hover:bg-orange-100 rounded-lg transition-all"
                title="Volver a selección de clientes"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2 px-1">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            <p className="text-[10px] text-orange-500 font-black uppercase tracking-widest">
              Modo Prospecto
            </p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer group">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                checked={saveAsClient}
                onChange={(e) => setSaveAsClient(e.target.checked)}
                className="peer h-4 w-4 appearance-none rounded border border-orange-300 bg-white checked:bg-orange-500 checked:border-orange-500 transition-all cursor-pointer"
              />
              <Check className="absolute h-3 w-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none left-0.5" />
            </div>
            <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest group-hover:text-orange-700 transition-colors">
              ¿Guardar en catálogo?
            </span>
          </label>
        </div>
        <input type="hidden" name="clientId" value="" />
        <input type="hidden" name="prospectName" value={localProspect} />
        <input type="hidden" name="saveAsClient" value={saveAsClient ? "true" : "false"} />
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Cliente *</label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full text-sm font-medium rounded-xl py-3 px-4 border transition-all duration-200 shadow-sm ${
          disabled 
            ? "bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed" 
            : isOpen
              ? "bg-white border-red-600 ring-4 ring-red-600/10 text-gray-900"
              : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-white hover:border-gray-300"
        }`}
      >
        <span className="truncate">
          {selectedClient ? selectedClient.name : "Seleccionar cliente..."}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 ml-2 transition-transform duration-300 ${isOpen ? 'rotate-180 text-red-600' : ''}`} />
      </button>

      {/* Hidden inputs */}
      <input type="hidden" name="clientId" value={value} />
      <input type="hidden" name="prospectName" value="" />

      {isOpen && !disabled && (
        <div className="absolute z-50 mt-2 w-full bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-200 origin-top" style={{ minWidth: "300px" }}>
          <div className="p-3 border-b border-gray-50 bg-gray-50/50">
            <div className="relative mb-2">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                autoFocus
                className="block w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all sm:text-xs"
                placeholder="Buscar por nombre, email o empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <ul className="max-h-64 overflow-y-auto py-2 text-sm text-gray-700">
            {/* Clear selection */}
            {value && (
              <li
                onClick={() => { onChange(""); setIsOpen(false); }}
                className="flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-50"
              >
                <X className="h-3 w-3" /> Quitar selección
              </li>
            )}

            {filteredClients.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-gray-400 text-xs font-medium">No se encontraron clientes</p>
              </div>
            ) : (
              filteredClients.map((c) => (
                <li
                  key={c.id}
                  onClick={() => { onChange(c.id); setIsOpen(false); }}
                  className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors group ${
                    value === c.id ? "bg-red-50" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex flex-col min-w-0">
                    <span className={`truncate text-xs font-bold ${value === c.id ? "text-red-700" : "text-gray-700 group-hover:text-gray-900"}`}>
                      {c.name}
                    </span>
                    {(c.email || c.company) && (
                      <span className="truncate text-[10px] text-gray-400 mt-0.5 group-hover:text-gray-500">
                        {c.company ? `${c.company} ` : ""}
                        {c.company && c.email ? "• " : ""}
                        {c.email}
                      </span>
                    )}
                  </div>
                  {value === c.id && <Check className="h-4 w-4 text-red-600 shrink-0 ml-4" />}
                </li>
              ))
            )}
          </ul>

          {/* Prospect mode option */}
          <div className="border-t border-gray-100 p-3 bg-gray-50/50">
            <button
              type="button"
              onClick={switchToProspect}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-[10px] font-black text-orange-600 border border-orange-200 rounded-xl shadow-sm hover:bg-orange-50 hover:border-orange-300 transition-all uppercase tracking-widest"
            >
              <UserPlus className="h-4 w-4" />
              Usar como Prospecto
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
