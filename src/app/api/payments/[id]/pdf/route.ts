import { NextRequest, NextResponse } from "next/server";
import { generateChargeNotePDF } from "@/lib/pdf";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let paymentReq: any;

    if (id === "preview") {
      // Allow overriding parameters via query string for preview mode
      const searchParams = req.nextUrl.searchParams;
      paymentReq = {
        amountRequested: parseFloat(searchParams.get("amount") || "0"),
        notes: searchParams.get("notes") || "",
        createdAt: new Date(),
        overrideClientName: searchParams.get("clientName") || "Cliente de Prueba",
        overrideProjectName: searchParams.get("projectName") || "Proyecto de Prueba",
        overrideQuoteFolio: searchParams.get("folio") || "N/A",
        overrideCreatorName: searchParams.get("creatorName") || "Administración"
      };
    } else {
      // Fetch from DB
      paymentReq = await prisma.paymentRequest.findUnique({
        where: { id },
        include: {
          client: true,
          quote: true,
          createdBy: true,
        },
      });

      if (!paymentReq) {
        return new NextResponse("Not Found", { status: 404 });
      }
    }

    const pdfBuffer = await generateChargeNotePDF(paymentReq);

    const filename = `Nota_Cargo_${paymentReq.quote?.folio || paymentReq.overrideQuoteFolio || "Preview"}.pdf`;

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error generating Charge Note PDF:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
