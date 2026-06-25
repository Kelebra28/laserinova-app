import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const res = await prisma.email.deleteMany({});
    return NextResponse.json({ success: true, message: 'Base de datos de correos borrada con éxito en producción.', count: res.count });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
