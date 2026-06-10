import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateQuotePDF } from "@/lib/pdf";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const quoteId = params.id;
  const url = new URL(request.url);
  const allVersions = url.searchParams.get("allVersions") === "true";

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      client: true,
      concepts: {
        orderBy: { order: 'asc' },
        include: { material: true }
      }
    }
  });

  if (!quote) {
    return new NextResponse("Quote not found", { status: 404 });
  }

  let quotesToRender = [quote];

  if (allVersions && quote.versionGroupId) {
    const siblings = await prisma.quote.findMany({
      where: { versionGroupId: quote.versionGroupId },
      include: {
        client: true,
        concepts: {
          orderBy: { order: 'asc' },
          include: { material: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
    if (siblings.length > 0) {
      quotesToRender = siblings;
    }
  }

  try {
    const pdfBuffer = await generateQuotePDF(quotesToRender);
    
    const filename = allVersions && quote.versionGroupId 
      ? `Opciones_Cotizacion_${quote.folio.split('-OP')[0]}.pdf`
      : `Cotizacion_${quote.folio}.pdf`;

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return new NextResponse("Error generating PDF", { status: 500 });
  }
}
