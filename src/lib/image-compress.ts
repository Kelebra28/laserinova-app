import { CHAT_IMAGE_COMPRESSION, CHAT_MAX_UPLOAD_BYTES } from '@/constants/chat.constants';

const COMPRESSIBLE = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/bmp'];
/** Formatos que WhatsApp muestra como foto; los demás conviene convertirlos aunque pesen poco. */
const SENDABLE_AS_PHOTO = ['image/jpeg', 'image/png'];

const toJpeg = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));

/**
 * Reduce una foto en el navegador antes de subirla. GIF, SVG y lo que no sea imagen se devuelven
 * sin tocar, igual que cualquier imagen que el navegador no sepa leer.
 */
export async function compressImage(file: File): Promise<File> {
  const type = file.type.toLowerCase();
  if (!COMPRESSIBLE.includes(type)) return file;
  const sendable = SENDABLE_AS_PHOTO.includes(type);
  if (sendable && file.size <= CHAT_IMAGE_COMPRESSION.skipBelowBytes) return file;

  let bitmap: ImageBitmap;
  try {
    // imageOrientation: respeta el giro de las fotos de celular.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file;
  }

  try {
    const { maxSide, quality, maxAttempts, shrinkFactor } = CHAT_IMAGE_COMPRESSION;
    let scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    let blob: Blob | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) return file;
      // JPG no tiene transparencia: sin fondo blanco, un PNG transparente saldría negro.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      blob = await toJpeg(canvas, quality);
      if (!blob || blob.size <= CHAT_MAX_UPLOAD_BYTES) break;
      scale *= shrinkFactor;
    }

    if (!blob || (sendable && blob.size >= file.size)) return file;
    const name = `${file.name.replace(/\.[^.]+$/, '') || 'foto'}.jpg`;
    return new File([blob], name, { type: 'image/jpeg' });
  } finally {
    bitmap.close();
  }
}
