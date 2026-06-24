import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const receipt = await prisma.receipt.findUnique({
      where: { id },
      include: {
        client: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!receipt) {
      return NextResponse.json({ error: "Recibo no encontrado" }, { status: 404 });
    }

    return NextResponse.json(receipt);
  } catch (error: any) {
    console.error("[RECEIPT_GET_BY_ID]", error);
    return NextResponse.json(
      { error: error?.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { id } = await params;
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
      status,
      addPaymentAmount, // Opcional: registrar un abono a la cuenta
    } = body;

    const updatedReceipt = await prisma.$transaction(async (tx) => {
      const current = await tx.receipt.findUnique({
        where: { id },
      });

      if (!current) {
        throw new Error("Recibo no encontrado");
      }

      let newTotal = total !== undefined ? parseFloat(total) : current.total;
      let newAdvance = advance !== undefined ? parseFloat(advance) : current.advance;
      let newStatus = status || current.status;
      let pMethod = paymentMethod || current.paymentMethod;

      // Si se envía un abono explícito (addPaymentAmount)
      if (addPaymentAmount && parseFloat(addPaymentAmount) > 0) {
        const payment = parseFloat(addPaymentAmount);
        newAdvance = current.advance + payment;
        const newBalance = newTotal - newAdvance;
        newStatus = newBalance <= 0 ? "PAID" : "PENDING";

        // Registrar la transacción de abono / liquidación
        const isFullLiquidation = newBalance <= 0;
        await tx.financialTransaction.create({
          data: {
            type: isFullLiquidation ? "LIQUIDACION" : "INGRESO",
            category: isFullLiquidation ? "Liquidación de Proyecto" : "Pago Completo",
            amount: payment,
            description: `${isFullLiquidation ? "Liquidación" : "Abono"} de recibo ${current.folio} - Proyecto: ${project || current.project}`,
            notes: `Generado automáticamente desde abono de recibo.`,
            date: new Date(),
            paymentMethod: (pMethod || "efectivo").toLowerCase(),
            clientId: clientId || current.clientId || null,
            createdById: userId,
            status: "ACTIVO",
          },
        });
      } else if (status === "PAID" && current.status === "PENDING") {
        // Si cambió el estatus a PAGADO de forma manual y no se había liquidado
        const remaining = newTotal - newAdvance;
        if (remaining > 0) {
          newAdvance = newTotal; // Asumimos que se pagó la totalidad del restante
          await tx.financialTransaction.create({
            data: {
              type: "LIQUIDACION",
              category: "Liquidación de Proyecto",
              amount: remaining,
              description: `Liquidación manual de recibo ${current.folio} - Proyecto: ${project || current.project}`,
              notes: `Registrado al marcar como pagado manualmente.`,
              date: new Date(),
              paymentMethod: (pMethod || "efectivo").toLowerCase(),
              clientId: clientId || current.clientId || null,
              createdById: userId,
              status: "ACTIVO",
            },
          });
        }
      }

      const newBalance = newTotal - newAdvance;
      if (newBalance <= 0) {
        newStatus = "PAID";
      }

      return await tx.receipt.update({
        where: { id },
        data: {
          clientId: clientId !== undefined ? (clientId || null) : current.clientId,
          prospectName: clientId ? null : (prospectName !== undefined ? (prospectName || null) : current.prospectName),
          project: project || current.project,
          description: description !== undefined ? (description || null) : current.description,
          concepts: concepts ? JSON.parse(JSON.stringify(concepts)) : current.concepts,
          total: newTotal,
          advance: newAdvance,
          balance: newBalance,
          paymentMethod: pMethod,
          notes: notes !== undefined ? (notes || null) : current.notes,
          status: newStatus,
        },
      });
    });

    return NextResponse.json(updatedReceipt);
  } catch (error: any) {
    console.error("[RECEIPT_PUT]", error);
    return NextResponse.json(
      { error: error?.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    await prisma.receipt.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[RECEIPT_DELETE]", error);
    return NextResponse.json(
      { error: error?.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}
