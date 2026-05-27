import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { mkdir } from 'fs/promises';
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

    const uploadDir = join(process.cwd(), 'public', 'uploads');
    
    // Crear el directorio si no existe (silenciosamente si ya existe)
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (err) {
      // ignore
    }

    const filename = `${Date.now()}-${Math.round(Math.random() * 1000)}.webp`;
    const filepath = join(uploadDir, filename);

    await sharp(buffer)
      .resize({
        width: 1000,
        height: 1000,
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 80 })
      .toFile(filepath);

    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
