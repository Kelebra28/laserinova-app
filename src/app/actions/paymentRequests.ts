"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getPendingQuotesByClient(clientId: string) {
  try {
    const quotes = await prisma.quote.findMany({
      where: {
        clientId: clientId,
        status: { notIn: ["CANCELLED", "REJECTED"] },
      },
      select: {
        id: true,
        folio: true,
        project: true,
        total: true,
        realAmountCollected: true,
        paymentStatus: true,
        concepts: {
          select: {
            id: true,
            conceptType: true,
            description: true,
            totalAmount: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    // We return all active quotes, not just the pending ones, so the user can select any quote
    return { success: true, quotes };
  } catch (error: any) {
    console.error("Error fetching pending quotes:", error);
    return { success: false, error: error.message };
  }
}

export async function createPaymentRequest(data: {
  amountRequested: number;
  notes?: string;
  quoteId: string;
  clientId: string;
  createdById: string;
}) {
  try {
    const { amountRequested, notes, quoteId, clientId, createdById } = data;

    // 1. Create Payment Request
    const pr = await prisma.paymentRequest.create({
      data: {
        amountRequested,
        notes,
        quoteId,
        clientId,
        createdById,
        status: "PENDING",
      },
      include: {
        quote: { select: { folio: true, project: true } },
        client: { select: { name: true } },
      }
    });

    // 2. Ensure "Cobro pendiente" tag exists or create it
    let tag = await prisma.taskTag.findUnique({ where: { name: "Cobro pendiente" } });
    if (!tag) {
      tag = await prisma.taskTag.create({
        data: { name: "Cobro pendiente", color: "rose" },
      });
    }

    // 3. Create a Task automatically
    const taskTitle = `Cobro pendiente - ${pr.quote.folio}`;
    const taskDesc = `Solicitud de pago por $${amountRequested.toLocaleString('es-MX', { minimumFractionDigits: 2 })}.\n\nCliente: ${pr.client.name}\nProyecto: ${pr.quote.project}\nNotas: ${notes || 'N/A'}`;

    const task = await prisma.task.create({
      data: {
        title: taskTitle,
        description: taskDesc,
        status: "PENDING",
        priority: "HIGH",
        createdById,
        tags: { connect: { id: tag.id } },
        assignees: {
          create: {
            userId: createdById, // Assign to creator by default
          }
        }
      },
    });

    revalidatePath("/dashboard/accounting/payments");
    revalidatePath("/dashboard/tasks");
    
    return { success: true, paymentRequest: pr };
  } catch (error: any) {
    console.error("Error creating payment request:", error);
    return { success: false, error: error.message };
  }
}

export async function getPaymentRequests() {
  try {
    const requests = await prisma.paymentRequest.findMany({
      include: {
        quote: { select: { folio: true, project: true } },
        client: { select: { name: true, company: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: requests };
  } catch (error: any) {
    console.error("Error fetching payment requests:", error);
    return { success: false, error: error.message };
  }
}

async function syncQuoteFinancials(quoteId: string, amountDelta: number, pr?: any, isDelete?: boolean) {
  const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
  if (!quote) return;
  
  const newAmount = (quote.realAmountCollected || 0) + amountDelta;
  let newPaymentStatus = quote.paymentStatus;
  
  // Consider floating point imprecision
  if (newAmount >= quote.total - 0.01) {
    newPaymentStatus = "PAID";
  } else if (newAmount > 0.01) {
    newPaymentStatus = "PARTIAL";
  } else {
    newPaymentStatus = "PENDING";
  }

  await prisma.quote.update({
    where: { id: quoteId },
    data: {
      realAmountCollected: newAmount,
      paymentStatus: newPaymentStatus
    }
  });

  if (pr) {
    if (amountDelta > 0 && !isDelete) {
      await prisma.financialTransaction.create({
        data: {
          type: "INGRESO",
          category: "Cobranza",
          amount: amountDelta,
          description: `Cobro de Solicitud - ${quote.folio}`,
          notes: `ID Solicitud: ${pr.id}`,
          date: new Date(),
          quoteId: quote.id,
          clientId: pr.clientId,
          createdById: pr.createdById,
          status: "ACTIVO"
        }
      });
      
      await prisma.task.updateMany({
        where: { 
          title: `Cobro pendiente - ${quote.folio}`,
          status: { not: "DONE" }
        },
        data: { status: "DONE" }
      });
    } else {
      await prisma.financialTransaction.updateMany({
        where: { notes: { contains: `ID Solicitud: ${pr.id}` } },
        data: { isDeleted: true, deletedAt: new Date(), status: "ANULADO" }
      });

      if (!isDelete) {
        await prisma.task.updateMany({
          where: { 
            title: `Cobro pendiente - ${quote.folio}`,
            status: "DONE"
          },
          data: { status: "PENDING" }
        });
      }
    }
  }
}

export async function updatePaymentRequestStatus(id: string, newStatus: string) {
  try {
    const currentPr = await prisma.paymentRequest.findUnique({ where: { id } });
    if (!currentPr) throw new Error("Payment request not found");

    if (currentPr.status !== newStatus) {
      if (newStatus === "PAID") {
        await syncQuoteFinancials(currentPr.quoteId, currentPr.amountRequested, currentPr);
      } else if (currentPr.status === "PAID") {
        await syncQuoteFinancials(currentPr.quoteId, -currentPr.amountRequested, currentPr);
      }
    }

    const pr = await prisma.paymentRequest.update({
      where: { id },
      data: { status: newStatus },
    });
    
    revalidatePath("/dashboard/payment-requests");
    return { success: true, data: pr };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deletePaymentRequest(id: string) {
  try {
    const currentPr = await prisma.paymentRequest.findUnique({ where: { id } });
    if (!currentPr) throw new Error("Not found");
    
    // If it was paid, remove its effect
    if (currentPr.status === "PAID") {
      await syncQuoteFinancials(currentPr.quoteId, -currentPr.amountRequested, currentPr, true);
    }
    
    await prisma.paymentRequest.delete({ where: { id } });
    
    revalidatePath("/dashboard/payment-requests");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updatePaymentRequest(id: string, data: { amountRequested: number; notes: string }) {
  try {
    const currentPr = await prisma.paymentRequest.findUnique({ where: { id } });
    if (!currentPr) throw new Error("Not found");
    
    // If it's paid, we need to adjust the difference
    if (currentPr.status === "PAID" && currentPr.amountRequested !== data.amountRequested) {
      await syncQuoteFinancials(currentPr.quoteId, -currentPr.amountRequested, currentPr, true);
      const updatedPr = { ...currentPr, amountRequested: data.amountRequested };
      await syncQuoteFinancials(currentPr.quoteId, data.amountRequested, updatedPr);
    }

    const pr = await prisma.paymentRequest.update({
      where: { id },
      data: {
        amountRequested: data.amountRequested,
        notes: data.notes
      }
    });
    
    revalidatePath("/dashboard/payment-requests");
    return { success: true, data: pr };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
