"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Search, X, Check, Package, Sparkles, ChevronDown } from "lucide-react";
import { getHexForColor, formatNumber, formatCurrency } from "@/lib/constants";
import { normalizeText, getWordVariations } from "@/lib/search";

export interface ProductItem {
  id: string;
  name: string;
  model?: string | null;
  sku?: string | null;
  brand?: string | null;
  color?: string | null;
  unitCost: number;
  unitPrice: number;
  stockQuantity?: number;
  image?: string | null;
  provider?: string | null;
  category?: { name: string } | string | null;
  description?: string | null;
}

interface ProductGroup {
  modelKey: string;
  model: string;
  name: string;
  cleanName: string;
  brand?: string | null;
  provider?: string | null;
  categoryName?: string;
  unitCost: number;
  unitPrice: number;
  totalStock: number;
  image?: string | null;
  variants: ProductItem[];
}

interface ProductComboboxProps {
  products: ProductItem[];
  selectedProductId?: string | null;
  onSelectProduct: (product: ProductItem) => void;
  onClear?: () => void;
  placeholder?: string;
}

export function ProductCombobox({
  products,
  selectedProductId,
  onSelectProduct,
  onClear,
  placeholder = "Buscar artículo por nombre, clave o modelo... 🔍",
}: ProductComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. Agrupar productos por modelo para evitar repeticiones por color
  const productGroups = useMemo(() => {
    const map = new Map<string, ProductGroup>();

    for (const p of products) {
      const cleanName = p.model ? p.name.split(p.model)[0].trim() : p.name;
      const key = (p.model || cleanName || p.id).toUpperCase().trim();

      if (!map.has(key)) {
        const catName = typeof p.category === "object" ? p.category?.name : (p.category || "");
        map.set(key, {
          modelKey: key,
          model: p.model || "",
          name: p.name,
          cleanName: cleanName || p.name,
          brand: p.brand,
          provider: p.provider,
          categoryName: catName || "",
          unitCost: p.unitCost,
          unitPrice: p.unitPrice,
          totalStock: 0,
          image: p.image,
          variants: [],
        });
      }

      const group = map.get(key)!;
      group.variants.push(p);
      group.totalStock += (p.stockQuantity || 0);

      if (!group.image && p.image) {
        group.image = p.image;
      }
    }

    return Array.from(map.values());
  }, [products]);

  // Producto actualmente seleccionado
  const selectedProduct = useMemo(() => {
    if (!selectedProductId) return null;
    return products.find((p) => p.id === selectedProductId) || null;
  }, [selectedProductId, products]);

  // Grupo al que pertenece el producto seleccionado
  const selectedGroup = useMemo(() => {
    if (!selectedProduct) return null;
    return productGroups.find((g) => g.variants.some((v) => v.id === selectedProduct.id)) || null;
  }, [selectedProduct, productGroups]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 2. Filtrado predictivo inteligente (acentos, singular/plural, sinónimos y categorías)
  const filteredGroups = useMemo(() => {
    if (!query.trim()) {
      return productGroups;
    }

    const cleanQuery = normalizeText(query);
    const tokens = cleanQuery.split(/\s+/).filter(Boolean);

    return productGroups.filter((g) => {
      const name = normalizeText(g.name || "");
      const cleanName = normalizeText(g.cleanName || "");
      const model = normalizeText(g.model || "");
      const brand = normalizeText(g.brand || "");
      const provider = normalizeText(g.provider || "");
      const category = normalizeText(g.categoryName || "");
      const colors = normalizeText(g.variants.map((v) => v.color || "").join(" "));
      const skus = normalizeText(g.variants.map((v) => v.sku || "").join(" "));
      const combined = `${name} ${cleanName} ${model} ${brand} ${provider} ${category} ${colors} ${skus}`;

      return tokens.every((token) => {
        const variations = getWordVariations(token);
        return variations.some((v) => combined.includes(v));
      });
    });
  }, [query, productGroups]);

  const handleSelect = (product: ProductItem) => {
    onSelectProduct(product);
    setIsOpen(false);
    setQuery("");
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Estado 1: Producto Seleccionado */}
      {selectedProduct ? (
        <div className="p-3 bg-indigo-50/80 border-2 border-indigo-200 rounded-2xl shadow-sm hover:border-indigo-300 transition-all space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {selectedProduct.image ? (
                <img
                  src={selectedProduct.image}
                  alt={selectedProduct.name}
                  className="w-12 h-12 object-contain rounded-xl bg-white border border-indigo-100 p-0.5 shrink-0 shadow-xs"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-white border border-indigo-100 flex items-center justify-center shrink-0 text-indigo-400">
                  <Package className="w-6 h-6" />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedProduct.model && (
                    <span className="px-2 py-0.5 bg-indigo-600 text-white font-mono text-[10px] font-bold rounded-md">
                      {selectedProduct.model}
                    </span>
                  )}
                  {selectedProduct.color && (
                    <span className="flex items-center gap-1 text-xs font-bold text-zinc-700 bg-white/80 px-2 py-0.5 rounded-md border border-indigo-100">
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-black/10 inline-block shrink-0"
                        style={{ background: getHexForColor(selectedProduct.color) }}
                      />
                      {selectedProduct.color.replace(/^\d+\s*-\s*/, "")}
                    </span>
                  )}
                </div>
                <p className="text-sm font-bold text-zinc-900 truncate mt-0.5" title={selectedProduct.name}>
                  {selectedGroup?.cleanName || selectedProduct.name}
                </p>
                <p className="text-[11px] text-zinc-600 font-medium">
                  Costo: <span className="font-bold text-red-600">{formatCurrency(selectedProduct.unitCost)}</span>
                  {selectedProduct.unitPrice > 0 && (
                    <> • Catálogo: <span className="font-bold text-emerald-600">{formatCurrency(selectedProduct.unitPrice)}</span></>
                  )}
                  {selectedProduct.stockQuantity !== undefined && (
                    <>
                      {" • Stock Color: "}
                      {selectedProduct.stockQuantity === 0 ? (
                        <span className="font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                          0 pzs (Agotado)
                        </span>
                      ) : selectedProduct.stockQuantity <= 50 ? (
                        <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          {formatNumber(selectedProduct.stockQuantity)} pzs (Bajo)
                        </span>
                      ) : (
                        <span className="font-bold text-zinc-800">
                          {formatNumber(selectedProduct.stockQuantity)} pzs
                        </span>
                      )}
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 ml-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(true);
                  setTimeout(() => inputRef.current?.focus(), 50);
                }}
                className="px-3 py-1.5 text-xs font-bold bg-white text-indigo-700 hover:bg-indigo-100 rounded-xl border border-indigo-200 shadow-xs transition-colors flex items-center gap-1"
              >
                Buscar otro
                <ChevronDown className="w-3.5 h-3.5 text-indigo-500" />
              </button>
              {onClear && (
                <button
                  type="button"
                  onClick={onClear}
                  title="Desvincular producto"
                  className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Selector Rápido de Color para el mismo modelo */}
          {selectedGroup && selectedGroup.variants.length > 1 && (
            <div className="pt-2 border-t border-indigo-200/60 flex items-center gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider shrink-0">
                Cambiar Color ({selectedGroup.variants.length}):
              </span>
              <div className="flex items-center gap-1.5">
                {selectedGroup.variants.map((v) => {
                  const isCurrent = v.id === selectedProduct.id;
                  const hex = getHexForColor(v.color);
                  const cleanColor = (v.color || "Color").replace(/^\d+\s*-\s*/, "");
                  const stock = v.stockQuantity || 0;
                  const isOutOfStock = stock === 0;

                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => handleSelect(v)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 border ${
                        isCurrent
                          ? isOutOfStock
                            ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                            : "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : isOutOfStock
                            ? "bg-zinc-50 text-zinc-400 border-dashed border-rose-200 hover:border-rose-400 hover:bg-rose-50/50"
                            : "bg-white text-zinc-700 border-zinc-200 hover:border-indigo-400 hover:bg-indigo-50/50"
                      }`}
                      title={`${cleanColor} (${isOutOfStock ? "Agotado" : `${formatNumber(stock)} pzs`})`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-black/10 inline-block shrink-0 shadow-2xs"
                        style={{ background: hex }}
                      />
                      <span className={isOutOfStock && !isCurrent ? "line-through text-zinc-400" : ""}>{cleanColor}</span>
                      <span className={`text-[10px] ${
                        isCurrent 
                          ? isOutOfStock ? "text-rose-100" : "text-indigo-200" 
                          : isOutOfStock ? "text-rose-500 font-semibold" : "text-zinc-400 font-normal"
                      }`}>
                        ({isOutOfStock ? "Agotado" : formatNumber(stock)})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Estado 2: Buscador Activo */
        <div className="relative">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3.5 text-indigo-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder={placeholder}
              className="w-full text-xs font-bold pl-10 pr-8 py-3 bg-indigo-50/50 border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-indigo-950 placeholder:text-indigo-400 transition-all outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 text-indigo-400 hover:text-indigo-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Menú Desplegable con Todos los Modelos y sus Variantes de Color */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-96 overflow-y-auto bg-white border border-zinc-200 rounded-2xl shadow-2xl divide-y divide-zinc-100 animate-in fade-in zoom-in-95 duration-150">
          <div className="sticky top-0 z-10 p-2.5 bg-zinc-50/95 backdrop-blur-xs flex items-center justify-between text-[11px] font-bold text-zinc-600 border-b border-zinc-200">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              {filteredGroups.length} modelos en catálogo ({products.length} artículos totales)
            </span>
            <span className="text-[10px] text-zinc-400 font-medium">Haz clic en el modelo o en un color</span>
          </div>

          {filteredGroups.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500 space-y-1">
              <p className="font-bold text-zinc-800 text-sm">No encontramos ningún modelo</p>
              <p className="text-[11px] text-zinc-400">Intenta buscar con otra palabra, clave o nombre.</p>
            </div>
          ) : (
            filteredGroups.map((group) => {
              const hasMultipleColors = group.variants.length > 1;

              return (
                <div
                  key={group.modelKey}
                  className="p-3 hover:bg-zinc-50 transition-colors space-y-2"
                >
                  {/* Encabezado del Modelo */}
                  <div
                    onClick={() => {
                      // Al dar clic en el modelo, seleccionar la primera variante si tiene 1 sola,
                      // o la que tenga mayor stock
                      const bestVariant = [...group.variants].sort((a, b) => (b.stockQuantity || 0) - (a.stockQuantity || 0))[0];
                      if (bestVariant) handleSelect(bestVariant);
                    }}
                    className="flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {group.image ? (
                        <img
                          src={group.image}
                          alt={group.name}
                          className="w-10 h-10 object-contain rounded-lg bg-white border border-zinc-200 p-0.5 shrink-0 group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0 text-zinc-400">
                          <Package className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {group.model && (
                            <span className="px-1.5 py-0.5 bg-zinc-900 text-white font-mono text-[9px] font-bold rounded">
                              {group.model}
                            </span>
                          )}
                          <span className="text-xs font-bold text-zinc-900 group-hover:text-indigo-600 transition-colors">
                            {group.cleanName}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          Costo: <strong className="text-red-600">{formatCurrency(group.unitCost)}</strong>
                          {group.unitPrice > 0 && (
                            <> • Venta: <strong className="text-emerald-600">{formatCurrency(group.unitPrice)}</strong></>
                          )}
                          {" • Stock Total: "}
                          {group.totalStock === 0 ? (
                            <span className="inline-flex items-center px-1.5 py-0.2 bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold rounded">
                              Agotado
                            </span>
                          ) : (
                            <strong className={group.totalStock <= 50 ? "text-amber-700" : "text-zinc-800"}>
                              {formatNumber(group.totalStock)} pzs
                            </strong>
                          )}
                          {" • "}
                          <span className="font-semibold text-indigo-600">
                            {group.variants.length} {group.variants.length === 1 ? "color" : "colores"}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-xs text-indigo-600 font-bold px-2 py-1 bg-indigo-50 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      {hasMultipleColors ? "Elegir color →" : "Seleccionar"}
                    </div>
                  </div>

                  {/* Fila de Selección Directa de Color (Pills con Stock) */}
                  <div className="flex items-center gap-1.5 flex-wrap pl-13 pt-1">
                    {group.variants.map((v) => {
                      const hex = getHexForColor(v.color);
                      const cleanColor = (v.color || "Color único").replace(/^\d+\s*-\s*/, "");
                      const isSelected = v.id === selectedProductId;
                      const stock = v.stockQuantity || 0;
                      const isOutOfStock = stock === 0;

                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelect(v);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 border transition-all ${
                            isSelected
                              ? isOutOfStock
                                ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                                : "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                              : isOutOfStock
                                ? "bg-zinc-50 text-zinc-400 border-dashed border-rose-200 hover:border-rose-300 hover:bg-rose-50/40 shadow-2xs"
                                : "bg-white text-zinc-700 border-zinc-200 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-900 shadow-2xs"
                          }`}
                          title={`${cleanColor} (${isOutOfStock ? "Agotado" : `${formatNumber(stock)} pzs`})`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-black/15 inline-block shrink-0"
                            style={{ background: hex }}
                          />
                          <span className={isOutOfStock && !isSelected ? "line-through text-zinc-400" : ""}>{cleanColor}</span>
                          <span className={`text-[10px] ${
                            isSelected 
                              ? isOutOfStock ? "text-rose-100" : "text-indigo-200" 
                              : isOutOfStock ? "text-rose-500 font-semibold" : "text-zinc-400 font-medium"
                          }`}>
                            ({isOutOfStock ? "Agotado" : formatNumber(stock)})
                          </span>
                          {isSelected && <Check className="w-3 h-3 text-white ml-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
