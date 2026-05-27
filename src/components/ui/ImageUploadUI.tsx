import { ChangeEvent, useState, DragEvent, useRef } from 'react';
import { Trash2, UploadCloud } from 'lucide-react';

interface ImageUploadUIProps {
  imageUrls: string[];
  isUploading: boolean;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onFilesDropped?: (files: FileList) => void;
  onRemoveImage: (index: number) => void;
}

export const ImageUploadUI = ({ imageUrls, isUploading, onFileChange, onFilesDropped, onRemoveImage }: ImageUploadUIProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (onFilesDropped) {
        onFilesDropped(e.dataTransfer.files);
      } else {
        // Fallback si no está onFilesDropped
        if (fileInputRef.current) {
          fileInputRef.current.files = e.dataTransfer.files;
          const event = new Event('change', { bubbles: true });
          fileInputRef.current.dispatchEvent(event);
        }
      }
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <label className="block text-sm font-medium text-gray-700">Imágenes de Referencia (Máximo 10)</label>
      
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200
          ${isDragging ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50/50 hover:bg-gray-50'}
          ${isUploading ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={onFileChange}
          disabled={isUploading}
          className="hidden"
        />
        
        <div className={`p-3 rounded-full mb-3 ${isDragging ? 'bg-red-100 text-red-600' : 'bg-white text-gray-400 shadow-sm'}`}>
          <UploadCloud className="w-6 h-6" />
        </div>
        <p className="text-sm font-bold text-gray-700 mb-1">
          {isDragging ? 'Suelta las imágenes aquí' : 'Haz clic para subir o arrastra tus imágenes'}
        </p>
        <p className="text-xs text-gray-500">
          Archivos PNG, JPG o WEBP (máx. 1000px)
        </p>
      </div>
      
      {imageUrls.length > 0 && (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {imageUrls.map((url, index) => (
            <div key={index} className="relative group rounded-lg overflow-hidden border border-gray-200 shadow-sm">
              <img src={url} alt={`Preview ${index}`} className="w-full h-24 object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onRemoveImage(index); }}
                  className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transform scale-90 group-hover:scale-100 transition-all shadow-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {isUploading && <p className="text-sm text-blue-600 font-medium animate-pulse text-center">Optimizando y subiendo imágenes...</p>}
    </div>
  );
};
