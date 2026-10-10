import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Importante: No usar force-dynamic si queremos que las imágenes se cacheen si es posible, 
// pero como leen de DB, mejor force-dynamic. El límite de config es para no quejarse de pre-render
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const messageId = resolvedParams.id;
    
    if (!messageId) {
      return new NextResponse("ID Missing", { status: 400 });
    }

    const message = await prisma.whatsAppMessage.findUnique({
      where: { id: messageId },
      select: { mediaUrl: true, mimeType: true }
    });

    if (!message || !message.mediaUrl) {
      return new NextResponse("Not Found", { status: 404 });
    }

    if (message.mediaUrl.startsWith('http')) {
      return NextResponse.redirect(message.mediaUrl);
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
      },
    });
  } catch (error) {
    console.error("Error serving media:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
