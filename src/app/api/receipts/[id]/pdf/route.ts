import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateReceiptPDF } from "@/lib/pdf";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse("No autorizado", { status: 401 });
    }

    const { id } = await props.params;

    const receipt = await prisma.receipt.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            company: true,
          },
        },
      },
    });

    if (!receipt) {
      return new NextResponse("Recibo no encontrado", { status: 404 });
    }

    const url = new URL(request.url);
    const showSignatures = url.searchParams.get("showSignatures") !== "false";

    const pdfBuffer = await generateReceiptPDF(receipt, showSignatures);

    const filename = `NotaPedido_${receipt.folio}.pdf`;

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error generating receipt PDF:", error);
    return new NextResponse("Error al generar PDF", { status: 500 });
  }
}
