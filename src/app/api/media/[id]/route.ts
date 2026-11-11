import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { guardApi } from "@/lib/api-auth";

// Importante: No usar force-dynamic si queremos que las imágenes se cacheen si es posible, 
// pero como leen de DB, mejor force-dynamic. El límite de config es para no quejarse de pre-render
export const dynamic = 'force-dynamic';

const EXTENSIONS: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/zip': 'zip',
  'application/x-rar-compressed': 'rar',
  'application/vnd.rar': 'rar',
  'application/postscript': 'ai',
  'application/illustrator': 'ai',
  'application/dxf': 'dxf',
  'image/vnd.dxf': 'dxf',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'audio/ogg': 'ogg',
  'audio/mpeg': 'mp3',
  'text/plain': 'txt',
  'text/csv': 'csv',
};

// Nombre con el que se descarga: el que mandó el cliente (o "archivo"), siempre con extensión.
function downloadName(content: string | null, type: string, mimeType: string) {
  const fromContent = type === 'DOCUMENT' ? content?.trim() : '';
  let name = (fromContent || (type === 'IMAGE' ? 'foto' : 'archivo')).replace(/[\\/:*?"<>|\r\n]+/g, '_').slice(0, 150);
  const ext = EXTENSIONS[mimeType.split(';')[0].trim().toLowerCase()];
  if (ext && !/\.[a-z0-9]{2,5}$/i.test(name)) name += `.${ext}`;
  return name;
}

function contentDisposition(name: string) {
  const ascii = name.normalize('NFD').replace(/[^\x20-\x7e]/g, '').replace(/"/g, '') || 'archivo';
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await guardApi();
  if (denied) return denied;

  try {
    const resolvedParams = await params;
    const messageId = resolvedParams.id;
    const download = new URL(request.url).searchParams.get('download') === '1';
    
    if (!messageId) {
      return new NextResponse("ID Missing", { status: 400 });
    }

    const message = await prisma.whatsAppMessage.findUnique({
      where: { id: messageId },
      select: { mediaUrl: true, mimeType: true, content: true, type: true }
    });

    if (!message || !message.mediaUrl) {
      return new NextResponse("Not Found", { status: 404 });
    }

    if (message.mediaUrl.startsWith('http')) {
      if (!download) return NextResponse.redirect(message.mediaUrl);

      // Descarga: se pasa el archivo por aquí para mandarlo como adjunto y con su nombre real
      // (el navegador ignora el atributo download en enlaces de otro dominio y los abre).
      const upstream = await fetch(message.mediaUrl);
      if (!upstream.ok || !upstream.body) {
        return new NextResponse("No se pudo obtener el archivo", { status: 502 });
      }
      const mimeType = message.mimeType || upstream.headers.get('content-type') || 'application/octet-stream';
      const headers: Record<string, string> = {
        'Content-Type': mimeType,
        'Content-Disposition': contentDisposition(downloadName(message.content, message.type, mimeType)),
        'Cache-Control': 'private, max-age=3600',
      };
      const length = upstream.headers.get('content-length');
      if (length) headers['Content-Length'] = length;
      return new NextResponse(upstream.body, { headers });
    }

    // mediaUrl format: data:image/png;base64,iVBORw0KGgo...
    const matches = message.mediaUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      return new NextResponse("Invalid media format", { status: 500 });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        ...(download ? { 'Content-Disposition': contentDisposition(downloadName(message.content, message.type, mimeType)) } : {}),
      },
    });
  } catch (error) {
    console.error("Error serving media:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
