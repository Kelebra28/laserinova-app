'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, X } from 'lucide-react';

export type ViewerImage = {
  id: string;
  src: string;
  caption?: string | null;
  sender: string;
  timestamp: string | Date;
};

// Visor de fotos estilo WhatsApp: pantalla completa sobre el chat, sin abrir otra pestaña.
export default function ImageViewer({
  images,
  index,
  onIndexChange,
  onClose,
}: {
  images: ViewerImage[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  // El acercamiento es por foto: al cambiar de foto vuelve a verse completa.
  const [zoomedId, setZoomedId] = useState<string | null>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);
  const image = images[index];
  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;
  const zoomed = !!image && zoomedId === image.id;

  useEffect(() => {
    thumbsRef.current?.querySelector<HTMLElement>(`[data-index="${index}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && hasPrev) onIndexChange(index - 1);
      else if (e.key === 'ArrowRight' && hasNext) onIndexChange(index + 1);
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [index, hasPrev, hasNext, onClose, onIndexChange]);

  if (!image) return null;

  const date = new Date(image.timestamp);
  const when = `${date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  const caption = image.caption && image.caption !== '📷 Imagen adjunta' ? image.caption : null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#0b141a]/[0.97] text-[#e9edef] select-none" role="dialog" aria-modal="true" aria-label="Visor de imagen">
      {/* Encabezado: quién la mandó, cuándo, descargar y cerrar */}
      <div className="flex items-center gap-3 px-4 h-16 shrink-0 bg-[#202c33]/60">
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-medium truncate">{image.sender}</div>
          <div className="text-[12.5px] text-[#8696a0]">{when}</div>
        </div>
        <a
          href={`/api/media/${image.id}?download=1`}
          download
          title="Descargar"
          className="p-2.5 rounded-full text-[#aebac1] hover:bg-white/10 hover:text-white transition-colors"
        >
          <Download size={22} />
        </a>
        <button type="button" onClick={onClose} title="Cerrar (Esc)" className="p-2.5 rounded-full text-[#aebac1] hover:bg-white/10 hover:text-white transition-colors">
          <X size={24} />
        </button>
      </div>

      {/* Imagen: clic para acercar, clic en el fondo para cerrar */}
      <div className="relative flex-1 min-h-0 flex items-center justify-center" onClick={onClose}>
        {hasPrev && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onIndexChange(index - 1); }}
            title="Anterior"
            className="absolute left-3 md:left-6 z-10 p-2.5 rounded-full bg-[#202c33]/80 text-[#e9edef] hover:bg-[#2a3942] shadow-lg"
          >
            <ChevronLeft size={26} />
          </button>
        )}

        <div className={zoomed ? 'w-full h-full overflow-auto' : 'w-full h-full flex items-center justify-center py-4 px-14 md:py-8 md:px-24'}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={image.id}
            src={image.src}
            alt={caption || 'Imagen del chat'}
            onClick={(e) => { e.stopPropagation(); setZoomedId(zoomed ? null : image.id); }}
            className={zoomed
              ? 'max-w-none max-h-none w-[200%] cursor-zoom-out'
              : 'max-w-full max-h-full object-contain cursor-zoom-in rounded-sm shadow-2xl'}
            draggable={false}
          />
        </div>

        {hasNext && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onIndexChange(index + 1); }}
            title="Siguiente"
            className="absolute right-3 md:right-6 z-10 p-2.5 rounded-full bg-[#202c33]/80 text-[#e9edef] hover:bg-[#2a3942] shadow-lg"
          >
            <ChevronRight size={26} />
          </button>
        )}
      </div>

      {caption && (
        <div className="shrink-0 px-6 pb-2 text-center text-[14.5px] leading-snug whitespace-pre-wrap break-words max-h-24 overflow-y-auto">{caption}</div>
      )}

      {/* Miniaturas de las demás fotos del chat */}
      {images.length > 1 && (
        <div ref={thumbsRef} className="shrink-0 flex gap-2 px-4 py-3 overflow-x-auto justify-start md:justify-center border-t border-white/5">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              data-index={i}
              onClick={() => onIndexChange(i)}
              className={`shrink-0 w-14 h-14 rounded-md overflow-hidden transition-all ${i === index ? 'ring-[3px] ring-[#00a884] opacity-100' : 'opacity-50 hover:opacity-90'}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.src} alt="" className="w-full h-full object-cover" loading="lazy" draggable={false} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
