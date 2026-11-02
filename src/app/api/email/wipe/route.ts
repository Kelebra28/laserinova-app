import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { guardApi } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

// Operación destructiva: solo ADMIN y solo por POST (un GET puede dispararse por prefetch o enlaces).
export async function POST() {
  const denied = await guardApi('ADMIN');
  if (denied) return denied;

  try {
    const res = await prisma.email.deleteMany({});
    return NextResponse.json({ success: true, message: 'Base de datos de correos borrada con éxito.', count: res.count });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
