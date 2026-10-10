"use client";

import { useState } from "react";
import { Box, ImageOff } from "lucide-react";

interface ProductGalleryProps {
  mainImage: string | null;
  imagesJson: string | null;
  productName: string;
  provider: string | null;
  model?: string | null;
  color?: string | null;
  allVariantImages?: string[];
}

export function ProductGallery({ mainImage, imagesJson, productName, provider, model, color, allVariantImages = [] }: ProductGalleryProps) {
  // Intentar parsear el arreglo de imágenes extras
  let extraImages: string[] = [];
  try {
    if (imagesJson) {
      extraImages = JSON.parse(imagesJson);
    }
  } catch (e) {
    console.error("Error parsing images JSON", e);
  }

  // Si es Doble Vela, armar la URL del color específico
  let specificImage = null;
  if (provider === "Doble Vela" && model && color) {
    const colorName = color.replace(/^\d+\s*-\s*/, '').replace(/\s+/g, '').toLowerCase();
    specificImage = `https://doblevela.com/images/large/${model}_${colorName}_lrg.jpg`;
  }

  // Combinar: Primero la específica de color (si hay), luego las demás variantes, luego la genérica (mainImage), luego extras
  const allImagesRaw = specificImage 
    ? [specificImage, ...allVariantImages, mainImage, ...extraImages]
    : [...allVariantImages, mainImage, ...extraImages];
  
  // Limpiar nulos y duplicados
  const allImages = [...new Set(allImagesRaw.filter(Boolean))] as string[];
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());

  const handleImageError = (index: number) => {
    setFailedImages(prev => new Set(prev).add(index));
  };

  return (
    <div className="space-y-4">
      {/* Imagen Principal en Grande */}
      <div className="bg-white rounded-3xl p-8 flex items-center justify-center min-h-[400px] border border-zinc-200 relative overflow-hidden group shadow-sm transition-all duration-300">
        {allImages.length > 0 && !failedImages.has(currentIndex) ? (
          <img 
            src={allImages[currentIndex]} 
            alt={`${productName} - Vista ${currentIndex + 1}`} 
            className="w-full max-w-md h-auto object-contain group-hover:scale-105 transition-transform duration-700"
            onError={() => handleImageError(currentIndex)}
          />
        ) : (
          <div className="text-zinc-300 flex flex-col items-center justify-center h-full">
            <ImageOff className="w-20 h-20 mb-4 opacity-50 text-zinc-300" strokeWidth={1} />
            <span className="text-zinc-400 font-medium text-sm">Imagen no disponible en el servidor</span>
          </div>
        )}
        
        {provider && (
          <div className="absolute top-4 left-4 bg-red-50 text-red-600 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm border border-red-100">
            {provider}
          </div>
        )}
      </div>

      {/* Carrusel de Miniaturas */}
      {allImages.length > 1 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-4 pt-2 px-1 custom-scrollbar">
          {allImages.map((imgUrl, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`relative flex-shrink-0 w-20 h-20 bg-white rounded-xl overflow-hidden transition-all duration-300 border border-zinc-200 ${
                currentIndex === idx 
                  ? "ring-2 ring-red-500 ring-offset-2 shadow-md" 
                  : "opacity-70 hover:opacity-100 hover:ring-1 hover:ring-zinc-300 hover:ring-offset-1"
              }`}
            >
              {!failedImages.has(idx) ? (
                <img 
                  src={imgUrl} 
                  alt="miniatura" 
                  className="w-full h-full object-cover" 
                  onError={() => handleImageError(idx)}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-50">
                  <ImageOff className="w-6 h-6 text-zinc-300" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
