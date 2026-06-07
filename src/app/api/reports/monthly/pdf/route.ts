import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateMonthlyReportPDF } from "@/lib/pdf";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = parseInt(searchParams.get("month") || "");
  const year = parseInt(searchParams.get("year") || "");
  const tab = searchParams.get("tab") || "finanzas";

  if (!month || !year) {
    return NextResponse.json({ error: "Month and year are required" }, { status: 400 });
  }

  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const quotes = await prisma.quote.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        client: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const pdfBuffer = await generateMonthlyReportPDF(quotes, month, year, tab);

    return new NextResponse(pdfBuffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="reporte_${tab}_${month}_${year}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating monthly report:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
