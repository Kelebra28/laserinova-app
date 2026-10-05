export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Determinar categoría por tipo MIME
    const mime = file.type;
    let folder = 'docs';
    let finalBuffer = buffer;
    
    // Obtener la extensión original (limpiando posibles nombres raros)
    let extension = (file.name || '').split('.').pop()?.toLowerCase() || 'bin';

    if (mime.startsWith('image/')) {
      folder = 'images';
      extension = 'webp';
      // Optimización inteligente de imagen
      finalBuffer = await sharp(buffer)
        .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
    } else if (mime.startsWith('audio/')) {
      folder = 'audio';
    } else if (mime.startsWith('video/')) {
      folder = 'video';
    }

    // Asegurar que la ruta física exista dentro de public/uploads
    const uploadDir = join(process.cwd(), 'public', 'uploads', folder);
    await mkdir(uploadDir, { recursive: true });

    // Generar un nombre de archivo único
    const uniqueId = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileName = `${uniqueId}.${extension}`;
    const filePath = join(uploadDir, fileName);

    // Escribir el archivo físico en el disco de Hostinger (aprovechando los 150GB)
    await writeFile(filePath, finalBuffer);

    // Devolver la URL pública limpia que el navegador y la BD usarán
    const fileUrl = `/uploads/${folder}/${fileName}`;

    return NextResponse.json({ url: fileUrl });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
