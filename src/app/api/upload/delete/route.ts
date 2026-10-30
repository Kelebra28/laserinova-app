import { NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { unlink } from 'fs/promises';
import { join } from 'path';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
    }

    if (url.startsWith('data:image/')) {
      return NextResponse.json({ success: true });
    }

    // 1. Si es una URL de Vercel Blob
    if (url.includes('blob.vercel-storage.com')) {
      try {
        await del(url);
      } catch (blobErr) {
        console.error('Error al eliminar de Vercel Blob:', blobErr);
      }
      return NextResponse.json({ success: true });
    }

    // 2. Soporte para URLs locales legacy (/uploads/...)
    if (url.startsWith('/uploads/')) {
      const filename = url.replace('/uploads/', '');
      if (!filename.includes('..') && !filename.includes('/')) {
        const filepath = join(process.cwd(), 'public', 'uploads', filename);
        try {
          await unlink(filepath);
        } catch {
          // Ignorar en entorno serverless
        }
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error en delete route:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

