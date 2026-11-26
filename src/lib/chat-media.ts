type MediaMessage = { id: string; mediaUrl?: string | null };

/** URL para mostrar el archivo: externa, copia local mientras se envía, o la ruta que lo lee de la base. */
export function mediaSrcOf(message: MediaMessage): string {
  const url = message.mediaUrl;
  return url?.startsWith('http') || url?.startsWith('blob:') ? url : `/api/media/${message.id}`;
}

export function downloadHrefOf(message: MediaMessage): string {
  return `/api/media/${message.id}?download=1`;
}

/** Tipo de burbuja con el que se pinta un archivo antes de que el servidor lo confirme. */
export function optimisticMediaType(mimeType: string): 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT' {
  if (mimeType.startsWith('image/')) return 'IMAGE';
  if (mimeType.startsWith('audio/')) return 'AUDIO';
  if (mimeType.startsWith('video/')) return 'VIDEO';
  return 'DOCUMENT';
}
