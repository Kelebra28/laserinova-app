export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { put } from '@vercel/blob';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes as ArrayBuffer);

    // Determinar categoría por tipo MIME
    const mime = file.type || '';
    let folder = 'docs';
    let finalBuffer: Buffer = buffer;
    let contentType = mime || 'application/octet-stream';

    // Obtener la extensión original (limpiando posibles nombres raros)
    let extension = (file.name || '').split('.').pop()?.toLowerCase() || 'bin';

    if (mime.startsWith('image/')) {
      folder = 'images';
      extension = 'webp';
      contentType = 'image/webp';
      // Optimización inteligente de imagen con Sharp
      finalBuffer = await sharp(buffer)
        .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
    } else if (mime.startsWith('audio/')) {
      folder = 'audio';
    } else if (mime.startsWith('video/')) {
      folder = 'video';
    }

    // Generar un nombre de archivo único
    const uniqueId = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const pathname = `uploads/${folder}/${uniqueId}.${extension}`;

    // Subir a Vercel Blob Storage
    const blob = await put(pathname, finalBuffer, {
      access: 'public',
      contentType,
    });

    // Devolver la URL pública permanente de Vercel Blob
    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error('Error uploading file to Vercel Blob:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

