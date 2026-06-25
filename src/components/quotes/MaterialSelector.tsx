"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, Check } from "lucide-react";

interface MaterialSelectorProps {
  materials: any[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}

export default function MaterialSelector({ materials, value, onChange, disabled }: MaterialSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set(materials.map(m => m.category?.name || "Otros"));
    return ["Todos", ...Array.from(cats)].sort();
  }, [materials]);

  // Filter materials based on search and category
  const filteredMaterials = useMemo(() => {
    return materials.filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (m.brand && m.brand.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = selectedCategory === "Todos" || (m.category?.name || "Otros") === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [materials, searchTerm, selectedCategory]);

  const selectedMaterial = materials.find(m => m.id === value);

  return (
    <div ref={wrapperRef} className="relative w-full">
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
          {selectedMaterial ? (
            <>
              {selectedMaterial.name} {selectedMaterial.brand ? `(${selectedMaterial.brand})` : ''}
              {selectedMaterial.location && <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded ml-1 font-black tracking-wider text-[9px] uppercase">[{selectedMaterial.location}]</span>}
            </>
          ) : "Seleccionar material..."}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 ml-2 transition-transform duration-300 ${isOpen ? 'rotate-180 text-red-600' : ''}`} />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 mt-2 w-full bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-200 origin-top" style={{ minWidth: "320px" }}>
          <div className="p-3 border-b border-gray-50 bg-gray-50/50">
            {/* Search Input */}
            <div className="relative mb-3">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                autoFocus
                className="block w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all sm:text-xs"
                placeholder="Buscar material o marca..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Category Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`shrink-0 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-full transition-all ${
                    selectedCategory === cat 
                      ? "bg-red-600 text-white shadow-md shadow-red-600/20" 
                      : "bg-white text-gray-400 border border-gray-100 hover:bg-gray-100 hover:text-gray-600"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <ul className="max-h-64 overflow-y-auto py-2 text-sm text-gray-700">
            {filteredMaterials.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="flex justify-center mb-2">
                  <Search className="h-8 w-8 text-gray-200" />
                </div>
                <p className="text-gray-400 text-xs font-medium">No se encontraron resultados</p>
              </div>
            ) : (
              filteredMaterials.map((m) => (
                <li
                  key={m.id}
                  onClick={() => {
                    onChange(m.id);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors group ${
                    value === m.id ? "bg-red-50" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex flex-col min-w-0">
                    <span className={`truncate text-xs font-bold ${value === m.id ? "text-red-700" : "text-gray-700 group-hover:text-gray-900"}`}>
                      {m.name} {m.brand && <span className="text-gray-400 font-normal ml-1">({m.brand})</span>}
                      {m.location && <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded ml-1 font-black tracking-wider text-[9px] uppercase">[{m.location}]</span>}
                    </span>
                    <span className="text-[10px] text-gray-400 group-hover:text-gray-500">${(m.pricePerCm2 * 10000).toFixed(2)} / m²</span>
                  </div>
                  {value === m.id && <Check className="h-4 w-4 text-red-600 shrink-0 ml-4" />}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
