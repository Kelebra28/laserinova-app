import { NextRequest, NextResponse } from "next/server";
import { generateQuotePDF } from "@/lib/pdf";
import { guardApi } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  const denied = await guardApi();
  if (denied) return denied;

  try {
    const mockQuote = await req.json();
    
    // We pass the mockQuote to the existing PDF generator.
    // The generator expects certain properties which we provided in the client.
    const pdfBuffer = await generateQuotePDF(mockQuote);
    
    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=Cotizacion_Libre_${mockQuote.folio}.pdf`
      }
    });

  } catch (error: any) {
    console.error("Error generating quick quote PDF:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
