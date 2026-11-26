'use client';

import { useEffect, useRef } from 'react';
import { FileText, X } from 'lucide-react';

export default function StagedFileThumb({ file, onRemove }: { file: File; onRemove: () => void }) {
  const isImage = file.type.startsWith('image/');
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!isImage || !imageRef.current) return;
    const url = URL.createObjectURL(file);
    imageRef.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file, isImage]);

  return (
    <div className="relative group shrink-0">
      {isImage ? (
        <div className="w-24 h-24 bg-[#111b21] rounded-lg overflow-hidden relative border border-[#2a3942]">
          <img ref={imageRef} alt="Preview" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-24 h-24 bg-[#111b21] rounded-lg flex flex-col items-center justify-center p-2 border border-[#2a3942]">
          <FileText size={24} className="text-[#8696a0] mb-1" />
          <span className="text-[10px] font-medium text-[#e9edef] truncate w-full text-center">{file.name}</span>
        </div>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Quitar ${file.name}`}
        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
      >
        <X size={12} />
      </button>
    </div>
  );
}
