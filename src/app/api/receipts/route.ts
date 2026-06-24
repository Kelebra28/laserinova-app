import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

/**
 * Genera el siguiente folio de recibo.
 * Formato: REC-YYYY-XXXX
 */
async function generateNextReceiptFolio(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `REC-${year}-`;

  const lastReceipt = await prisma.receipt.findFirst({
    where: { folio: { startsWith: prefix } },
    orderBy: { folio: "desc" },
    select: { folio: true },
  });

  let nextNumber = 1;
  if (lastReceipt) {
    const lastNumber = parseInt(lastReceipt.folio.replace(prefix, ""), 10);
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const where: any = {};

    if (search) {
      where.OR = [
        { folio: { contains: search } },
        { project: { contains: search } },
        { prospectName: { contains: search } },
        { client: { name: { contains: search } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const receipts = await prisma.receipt.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            company: true,
            email: true,
            phone: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(receipts);
  } catch (error: any) {
    console.error("[RECEIPTS_GET]", error);
    return NextResponse.json(
      { error: error?.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();

    const {
      clientId,
      prospectName,
      project,
      description,
      concepts,
      total,
      advance,
      paymentMethod,
      notes,
      quoteId,
    } = body;

    if (!project || total === undefined || total === null) {
      return NextResponse.json(
        { error: "El nombre del proyecto y el total son campos obligatorios." },
        { status: 400 }
      );
    }

    const numericTotal = parseFloat(total) || 0;
    const numericAdvance = parseFloat(advance) || 0;
    const numericBalance = numericTotal - numericAdvance;
    const isPaid = numericBalance <= 0;
    const receiptStatus = isPaid ? "PAID" : "PENDING";

    // Generar folio con reintentos para evitar colisiones
    let receipt;
    let attempts = 0;

    while (true) {
      attempts++;
      if (attempts > 5) {
        throw new Error("No se pudo generar un folio único para el recibo. Intente de nuevo.");
      }

      const folio = await generateNextReceiptFolio();

      try {
        receipt = await prisma.$transaction(async (tx) => {
          // 1. Crear el recibo
          const newReceipt = await tx.receipt.create({
            data: {
              folio,
              clientId: clientId || null,
              prospectName: clientId ? null : (prospectName || null),
              userId,
              project,
              description: description || null,
              concepts: concepts ? JSON.parse(JSON.stringify(concepts)) : null,
              total: numericTotal,
              advance: numericAdvance,
              balance: numericBalance,
              paymentMethod: paymentMethod || "EFECTIVO",
              notes: notes || null,
              status: receiptStatus,
              quoteId: quoteId || null,
            },
          });

          // 2. Si hay un anticipo, registrar la transacción financiera correspondiente
          if (numericAdvance > 0) {
            await tx.financialTransaction.create({
              data: {
                type: "ANTICIPO",
                category: "Anticipo de Proyecto",
                amount: numericAdvance,
                description: `Anticipo de recibo ${folio} - Proyecto: ${project}`,
                notes: `Generado automáticamente desde el módulo de Recibos.`,
                date: new Date(),
                paymentMethod: (paymentMethod || "efectivo").toLowerCase(),
                clientId: clientId || null,
                createdById: userId,
                status: "ACTIVO",
              },
            });
          }

          return newReceipt;
        });

        break; // Éxito
      } catch (err: any) {
        if (err?.code === "P2002" && err?.meta?.target === "Receipt_folio_key") {
          await new Promise((r) => setTimeout(r, 50 * attempts));
          continue; // Reintentar con un nuevo folio
        }
        throw err;
      }
    }

    return NextResponse.json(receipt);
  } catch (error: any) {
    console.error("[RECEIPTS_POST]", error);
    return NextResponse.json(
      { error: error?.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}
