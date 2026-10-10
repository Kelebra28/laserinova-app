"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Box, DollarSign, Tag, Info } from "lucide-react";
import { ProductGallery } from "./ProductGallery";

interface ProductDetailClientProps {
  initialProduct: any;
  variants: any[];
  liveStockData: any[] | null;
}

import { getHexForColor } from "@/lib/constants";

export function ProductDetailClient({ initialProduct, variants, liveStockData }: ProductDetailClientProps) {
  // Estado para el producto seleccionado actualmente
  const [activeVariant, setActiveVariant] = useState(initialProduct);

  // Encontrar el stock en vivo del producto activo si existe
  let activeLiveStock = null;
  if (liveStockData) {
    activeLiveStock = liveStockData.find(s => s.clave === activeVariant.sku);
  }
  const isLive = !!activeLiveStock;

  const displayPrice = isLive ? activeLiveStock.precioCosto : activeVariant.unitPrice;

  // Calcular las imágenes específicas de todas las variantes
  const allVariantImages = variants.map(v => {
    if (v.provider === "Doble Vela" && v.model && v.color) {
      const colorName = v.color.replace(/^\d+\s*-\s*/, '').replace(/\s+/g, '').toLowerCase();
      return `https://doblevela.com/images/large/${v.model}_${colorName}_lrg.jpg`;
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
          <p className="text-zinc-500">Consulta de información y stock en tiempo real.</p>
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
            <div className={`border rounded-2xl p-6 relative overflow-hidden shadow-sm ${isLive ? 'bg-blue-50 border-blue-200' : 'bg-white border-zinc-200'}`}>
              <div className="flex items-center gap-2 text-zinc-500 mb-2">
                <DollarSign className={`w-4 h-4 ${isLive ? 'text-blue-600' : ''}`} />
                <span className="text-sm font-medium uppercase tracking-wider">
                  Precio {isLive ? 'en Vivo' : 'Base'}
                </span>
              </div>
              <p className={`text-4xl font-black ${isLive ? 'text-blue-700' : 'text-zinc-900'}`}>
                ${(displayPrice * 1.16).toFixed(2)} <span className="text-sm font-medium text-zinc-500 ml-1">con IVA</span>
              </p>
              <p className="text-sm font-medium text-zinc-400 mt-1">
                ${displayPrice.toFixed(2)} sin IVA
              </p>
              {isLive && (
                <div className="absolute top-0 right-0 bg-blue-100 px-3 py-1 rounded-bl-xl text-[10px] font-bold text-blue-700 flex items-center gap-1 border-b border-l border-blue-200">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                  </span>
                  LIVE
                </div>
              )}
            </div>

            <div className={`border rounded-2xl p-6 relative overflow-hidden shadow-sm ${isLive ? 'bg-green-50 border-green-200' : 'bg-white border-zinc-200'}`}>
              <div className="flex items-center gap-2 text-zinc-500 mb-2">
                <Box className={`w-4 h-4 ${isLive ? 'text-green-600' : ''}`} />
                <span className="text-sm font-medium uppercase tracking-wider">
                  Stock {isLive ? 'en Vivo' : 'Local'}
                </span>
              </div>
              <p className={`text-3xl font-black ${isLive ? 'text-green-700' : 'text-zinc-900'}`}>
                {isLive ? activeLiveStock.stockReal : activeVariant.stockQuantity}
                <span className="text-sm font-normal text-zinc-500 ml-2">unidades</span>
              </p>
              {isLive && (
                <div className="absolute top-0 right-0 bg-green-100 px-3 py-1 rounded-bl-xl text-[10px] font-bold text-green-700 flex items-center gap-1 border-b border-l border-green-200">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-600"></span>
                  </span>
                  LIVE
                </div>
              )}
            </div>
          </div>

          {/* Variantes de Color (Selector Interactivo) */}
          {variants.length > 1 && (
            <div className="bg-white border border-zinc-200 shadow-sm rounded-2xl p-6">
              <p className="text-zinc-500 uppercase tracking-wider text-[10px] font-bold mb-3">Colores Disponibles ({variants.length})</p>
              <div className="flex flex-wrap gap-4">
                {variants.map(variant => {
                  const isSelected = variant.id === activeVariant.id;
                  const hex = getHexForColor(variant.color);
                  
                  // Calcular stock específico para esta variante en el loop
                  let variantLiveStock = null;
                  if (liveStockData) {
                    variantLiveStock = liveStockData.find(s => s.clave === variant.sku);
                  }
                  const stockDisplay = variantLiveStock ? variantLiveStock.stockReal : variant.stockQuantity;
                  
                  return (
                    <button
                      key={variant.id}
                      onClick={() => setActiveVariant(variant)}
                      className={`relative flex flex-col items-center gap-2 group transition-all`}
                      title={variant.color || 'Color'}
                    >
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                        isSelected
                          ? 'border-red-500 shadow-md scale-110 ring-4 ring-red-50' 
                          : 'border-zinc-200 hover:border-zinc-400 hover:scale-105'
                      }`}>
                        <div 
                          className="w-7 h-7 rounded-full shadow-inner border border-black/10" 
                          style={{ background: hex }}
                        />
                      </div>
                      <div className="flex flex-col items-center">
                        <span className={`text-[9px] uppercase font-bold tracking-wider ${isSelected ? 'text-red-600' : 'text-zinc-400 group-hover:text-zinc-600'}`}>
                          {variant.color?.replace(/^\d+\s*-\s*/, '')}
                        </span>
                        <span className={`text-[10px] font-black ${isSelected ? 'text-zinc-900' : 'text-zinc-500'}`}>
                          {stockDisplay} pzs
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

          {liveStockData && !isLive && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm flex items-start gap-3 shadow-sm">
              <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p>
                No pudimos recuperar el inventario en vivo para esta variante específica. Es posible que Doble Vela ya no la tenga disponible.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
