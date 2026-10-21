"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Box, DollarSign, Tag, Info, AlertCircle } from "lucide-react";
import { ProductGallery } from "./ProductGallery";
import { getHexForColor, formatNumber, formatCurrency } from "@/lib/constants";

interface ProductDetailClientProps {
  initialProduct: any;
  variants: any[];
  liveStockData?: any[] | null;
}

export function ProductDetailClient({ initialProduct, variants }: ProductDetailClientProps) {
  // Estado para el producto seleccionado actualmente
  const [activeVariant, setActiveVariant] = useState(initialProduct);

  const displayPrice = activeVariant.unitPrice || activeVariant.unitCost || 0;
  const activeStock = activeVariant.stockQuantity ?? 0;

  // Calcular las imágenes específicas de todas las variantes
  const allVariantImages = variants.map(v => {
    if (v.provider === "Doble Vela" && v.model && v.color) {
      const colorName = v.color.replace(/^\d+\s*-\s*/, '').replace(/\s+/g, '').toLowerCase();
      return `https://doblevela.com/images/large/${v.model}_${colorName}_lrg.jpg`;
    }
    if (v.image) {
      return v.image;
    }
    return null;
  }).filter(Boolean) as string[];

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/products" className="p-2 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-full transition-colors text-zinc-500 hover:text-zinc-900 shadow-sm">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-3xl font-black tracking-tight text-zinc-900">Detalle de Producto</h2>
          <p className="text-zinc-500">Consulta de información técnica y stock en almacenes CDMX.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Columna Izquierda: Galería de Imágenes */}
        <ProductGallery 
          key={activeVariant.id} // Forza re-render si cambia el producto
          mainImage={activeVariant.image} 
          imagesJson={activeVariant.images} 
          productName={activeVariant.name} 
          provider={activeVariant.provider} 
          model={activeVariant.model}
          color={activeVariant.color}
          allVariantImages={allVariantImages}
        />

        {/* Columna Derecha: Detalles y Stock */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 text-red-500 mb-2">
              <Tag className="w-4 h-4" />
              <span className="font-mono text-sm tracking-widest">{activeVariant.model || activeVariant.name}</span>
            </div>
            <h1 className="text-4xl font-bold text-zinc-900 leading-tight">{activeVariant.name}</h1>
          </div>

          {/* Tarjetas de Métricas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded-2xl p-6 relative overflow-hidden shadow-sm bg-white border-zinc-200">
              <div className="flex items-center gap-2 text-zinc-500 mb-2">
                <DollarSign className="w-4 h-4 text-zinc-600" />
                <span className="text-sm font-medium uppercase tracking-wider">
                  Precio Catálogo
                </span>
              </div>
              <p className="text-4xl font-black text-zinc-900">
                {formatCurrency(displayPrice * 1.16)} <span className="text-sm font-medium text-zinc-500 ml-1">con IVA</span>
              </p>
              <p className="text-sm font-medium text-zinc-400 mt-1">
                {formatCurrency(displayPrice)} sin IVA • Costo: <span className="font-bold text-red-600">{formatCurrency(activeVariant.unitCost)}</span>
              </p>
            </div>

            <div className={`border rounded-2xl p-6 relative overflow-hidden shadow-sm ${
              activeStock === 0 
                ? 'bg-rose-50/70 border-rose-200' 
                : activeStock <= 50 
                  ? 'bg-amber-50/70 border-amber-200' 
                  : 'bg-emerald-50/70 border-emerald-200'
            }`}>
              <div className="flex items-center gap-2 text-zinc-500 mb-2">
                <Box className={`w-4 h-4 ${
                  activeStock === 0 ? 'text-rose-600' : activeStock <= 50 ? 'text-amber-600' : 'text-emerald-600'
                }`} />
                <span className="text-sm font-medium uppercase tracking-wider">
                  {activeVariant.provider === "Promoopcion" ? "Stock Promo Opción" : "Stock Almacén CDMX"}
                </span>
              </div>
              <p className={`text-3xl font-black ${
                activeStock === 0 ? 'text-rose-700' : activeStock <= 50 ? 'text-amber-700' : 'text-emerald-700'
              }`}>
                {formatNumber(activeStock)}
                <span className="text-sm font-normal text-zinc-500 ml-2">unidades</span>
              </p>
              <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-[10px] font-bold flex items-center gap-1.5 border-b border-l ${
                activeStock === 0 
                  ? 'bg-rose-100 text-rose-700 border-rose-200' 
                  : activeStock <= 50 
                    ? 'bg-amber-100 text-amber-800 border-amber-200' 
                    : 'bg-emerald-100 text-emerald-700 border-emerald-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  activeStock === 0 ? 'bg-rose-500 animate-pulse' : activeStock <= 50 ? 'bg-amber-500' : 'bg-emerald-500'
                }`} />
                {activeStock === 0 ? 'AGOTADO' : activeStock <= 50 ? 'POCAS PIEZAS' : 'DISPONIBLE'}
              </div>
            </div>
          </div>

          {/* Banner de Advertencia si está agotado */}
          {activeStock === 0 && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-sm flex items-start gap-3 shadow-sm">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">
                  {activeVariant.provider === "Promoopcion" ? "Sin existencias en almacenes" : "Sin existencias en almacenes de CDMX"}
                </p>
                <p className="text-xs text-rose-600 mt-0.5">
                  {activeVariant.provider === "Promoopcion"
                    ? "Esta variante no cuenta con inventario disponible en Promo Opción actualmente."
                    : "Esta variante o color se encuentra agotada actualmente en los almacenes de CDMX (Alm. 7, 9, 15, 20 y 24)."}
                </p>
              </div>
            </div>
          )}

          {/* Variantes de Color (Selector Interactivo) */}
          {variants.length > 1 && (
            <div className="bg-white border border-zinc-200 shadow-sm rounded-2xl p-6">
              <p className="text-zinc-500 uppercase tracking-wider text-[10px] font-bold mb-3">Colores Disponibles ({variants.length})</p>
              <div className="flex flex-wrap gap-4">
                {variants.map(variant => {
                  const isSelected = variant.id === activeVariant.id;
                  const hex = getHexForColor(variant.color);
                  const stockDisplay = variant.stockQuantity || 0;
                  const isOutOfStock = stockDisplay === 0;
                  
                  return (
                    <button
                      key={variant.id}
                      onClick={() => setActiveVariant(variant)}
                      className={`relative flex flex-col items-center gap-2 group transition-all ${
                        isOutOfStock && !isSelected ? 'opacity-60 hover:opacity-100' : ''
                      }`}
                      title={`${variant.color || 'Color'} - ${isOutOfStock ? 'Agotado' : `${formatNumber(stockDisplay)} pzs`}`}
                    >
                      <div className={`relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                        isSelected
                          ? isOutOfStock
                            ? 'border-rose-500 shadow-md scale-110 ring-4 ring-rose-50' 
                            : 'border-red-500 shadow-md scale-110 ring-4 ring-red-50' 
                          : isOutOfStock
                            ? 'border-dashed border-rose-300 hover:border-rose-500'
                            : 'border-zinc-200 hover:border-zinc-400 hover:scale-105'
                      }`}>
                        <div 
                          className="w-7 h-7 rounded-full shadow-inner border border-black/10" 
                          style={{ background: hex }}
                        />
                        {isOutOfStock && (
                          <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-rose-600">
                            ✕
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col items-center">
                        <span className={`text-[9px] uppercase font-bold tracking-wider ${
                          isSelected 
                            ? isOutOfStock ? 'text-rose-600' : 'text-red-600' 
                            : isOutOfStock ? 'text-zinc-400 line-through' : 'text-zinc-400 group-hover:text-zinc-600'
                        }`}>
                          {variant.color?.replace(/^\d+\s*-\s*/, '')}
                        </span>
                        <span className={`text-[10px] font-black ${
                          isOutOfStock 
                            ? 'text-rose-500' 
                            : stockDisplay <= 50 
                              ? 'text-amber-600' 
                              : isSelected ? 'text-zinc-900' : 'text-zinc-500'
                        }`}>
                          {isOutOfStock ? 'Agotado' : `${formatNumber(stockDisplay)} pzs`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Descripción y Detalles Técnicos */}
          <div className="bg-white border border-zinc-200 shadow-sm rounded-2xl p-6 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2 mb-4">
                <Info className="w-5 h-5 text-zinc-400" />
                Ficha Técnica
              </h3>
              
              {activeVariant.description && (
                <div className="mb-6">
                  <p className="text-zinc-500 uppercase tracking-wider text-[10px] font-bold mb-1">Descripción Completa</p>
                  <p className="text-zinc-700 text-sm leading-relaxed">{activeVariant.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-y-5 gap-x-4 text-sm">
                <div>
                  <p className="text-zinc-500 uppercase tracking-wider text-[10px] font-bold mb-1">Material</p>
                  <p className="text-zinc-800 font-medium">{activeVariant.material || "N/A"}</p>
                </div>
                <div>
                  <p className="text-zinc-500 uppercase tracking-wider text-[10px] font-bold mb-1">Medidas</p>
                  <p className="text-zinc-800 font-medium">{activeVariant.measurements || "N/A"}</p>
                </div>
                <div>
                  <p className="text-zinc-500 uppercase tracking-wider text-[10px] font-bold mb-1">Empaque</p>
                  <p className="text-zinc-800 font-medium">{activeVariant.packageType || "N/A"}</p>
                </div>
                <div>
                  <p className="text-zinc-500 uppercase tracking-wider text-[10px] font-bold mb-1">Caja Máster</p>
                  <p className="text-zinc-800 font-medium">{activeVariant.masterBox || "N/A"}</p>
                </div>
                <div>
                  <p className="text-zinc-500 uppercase tracking-wider text-[10px] font-bold mb-1">Peso</p>
                  <p className="text-zinc-800 font-medium">{activeVariant.weight || "N/A"}</p>
                </div>
                <div>
                  <p className="text-zinc-500 uppercase tracking-wider text-[10px] font-bold mb-1">Color Activo</p>
                  <p className="text-zinc-800 font-medium">{activeVariant.color || "N/A"}</p>
                </div>
              </div>
            </div>

            {/* Técnicas de Impresión y Extras */}
            <div className="pt-4 border-t border-zinc-100">
              <div className="grid grid-cols-1 gap-y-5 text-sm">
                <div>
                  <p className="text-zinc-500 uppercase tracking-wider text-[10px] font-bold mb-1">Técnicas de Impresión</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {activeVariant.printTechniques ? (
                      activeVariant.printTechniques.split(',').map((tech: string, i: number) => (
                        <span key={i} className="px-2.5 py-1 bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs rounded-md">
                          {tech.trim()}
                        </span>
                      ))
                    ) : (
                      <span className="text-zinc-400 italic">No especificadas</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
