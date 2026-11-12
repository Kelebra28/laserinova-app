'use client';

import { useEffect, useRef } from 'react';

/**
 * Miniatura de una imagen adjunta antes de enviarla.
 * Crea el blob URL una sola vez por archivo y lo libera al quitarla: crearlo dentro del render
 * generaba uno nuevo en cada tecla y nunca se liberaba (con fotos de cámara la memoria se disparaba).
 */
export function StagedImagePreview({ file }: { file: File }) {
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    if (imgRef.current) imgRef.current.src = objectUrl;
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  // Blob local: next/image no aplica aquí.
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={imgRef} alt="Preview" className="w-full h-full object-cover" />;
}
