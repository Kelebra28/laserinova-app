import { NextResponse } from 'next/server';
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

    if (!url.startsWith('/uploads/')) {
      return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
    }

    const filename = url.replace('/uploads/', '');
    // Prevención de directory traversal básica
    if (filename.includes('..') || filename.includes('/')) {
        return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
    }

    const filepath = join(process.cwd(), 'public', 'uploads', filename);

    try {
      await unlink(filepath);
    } catch (err) {
      console.error('Error al eliminar archivo físicamente:', err);
      // No lanzamos error para que la UI pueda removerla de todos modos
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error en delete route:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
