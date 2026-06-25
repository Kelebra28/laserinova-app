import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user ? (session.user as any).id : null;
    
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtenemos las últimas 500 cotizaciones para extraer sugerencias
    // Usamos las últimas 500 para evitar sobrecarga de memoria si hay muchas
    const quotes = await prisma.quote.findMany({
      take: 500,
      orderBy: { createdAt: 'desc' },
      select: {
        project: true,
        description: true,
        concepts: {
          select: {
            description: true,
            details: true
          }
        }
      }
    });

    const projectSet = new Set<string>();
    const quoteDescSet = new Set<string>();
    const conceptDescSet = new Set<string>();
    const conceptDetailsSet = new Set<string>();

    quotes.forEach(q => {
      if (q.project && q.project.trim().length > 2) projectSet.add(q.project.trim());
      if (q.description && q.description.trim().length > 2) quoteDescSet.add(q.description.trim());
      
      q.concepts.forEach(c => {
        if (c.description && c.description.trim().length > 2) conceptDescSet.add(c.description.trim());
        if (c.details && c.details.trim().length > 2) conceptDetailsSet.add(c.details.trim());
      });
    });

    return NextResponse.json({
      projects: Array.from(projectSet),
      quoteDescriptions: Array.from(quoteDescSet),
      conceptDescriptions: Array.from(conceptDescSet),
      conceptDetails: Array.from(conceptDetailsSet)
    });
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
