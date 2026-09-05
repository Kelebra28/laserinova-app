import { prisma } from "@/lib/prisma";

export async function getPendingQuotesByClientService(clientId: string) {
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
  return quotes;
}

export async function getClientsForPaymentsService() {
  return await prisma.client.findMany({
    where: { active: true },
    select: { id: true, name: true, company: true },
    orderBy: { name: "asc" }
  });
}

export async function createPaymentRequestService(data: {
  amountRequested: number;
  notes?: string;
  quoteId: string;
  clientId: string;
  createdById: string;
}) {
  const { amountRequested, notes, quoteId, clientId, createdById } = data;

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

  let tag = await prisma.taskTag.findUnique({ where: { name: "Cobro pendiente" } });
  if (!tag) {
    tag = await prisma.taskTag.create({
      data: { name: "Cobro pendiente", color: "rose" },
    });
  }

  const taskTitle = `Cobro pendiente - ${pr.quote.folio}`;
  const taskDesc = `Solicitud de pago por $${amountRequested.toLocaleString('es-MX', { minimumFractionDigits: 2 })}.\n\nCliente: ${pr.client.name}\nProyecto: ${pr.quote.project}\nNotas: ${notes || 'N/A'}`;

  await prisma.task.create({
    data: {
      title: taskTitle,
      description: taskDesc,
      status: "PENDING",
      priority: "HIGH",
      createdById,
      tags: { connect: { id: tag.id } },
      assignees: {
        create: {
          userId: createdById, 
        }
      }
    },
  });

  return pr;
}

export async function getPaymentRequestsService() {
  return await prisma.paymentRequest.findMany({
    include: {
      quote: { select: { folio: true, project: true } },
      client: { select: { name: true, company: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function syncQuoteFinancialsService(quoteId: string, amountDelta: number, pr?: any, isDelete?: boolean) {
  const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
  if (!quote) return;
  
  const newAmount = (quote.realAmountCollected || 0) + amountDelta;
  let newPaymentStatus = quote.paymentStatus;
  
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

export async function updatePaymentRequestStatusService(id: string, newStatus: string) {
  const currentPr = await prisma.paymentRequest.findUnique({ where: { id } });
  if (!currentPr) throw new Error("Payment request not found");

  if (currentPr.status !== newStatus) {
    if (newStatus === "PAID") {
      await syncQuoteFinancialsService(currentPr.quoteId, currentPr.amountRequested, currentPr);
    } else if (currentPr.status === "PAID") {
      await syncQuoteFinancialsService(currentPr.quoteId, -currentPr.amountRequested, currentPr);
    }
  }

  return await prisma.paymentRequest.update({
    where: { id },
    data: { status: newStatus },
  });
}

export async function deletePaymentRequestService(id: string) {
  const currentPr = await prisma.paymentRequest.findUnique({ where: { id } });
  if (!currentPr) throw new Error("Not found");
  
  if (currentPr.status === "PAID") {
    await syncQuoteFinancialsService(currentPr.quoteId, -currentPr.amountRequested, currentPr, true);
  }
  
  await prisma.paymentRequest.delete({ where: { id } });
}

export async function updatePaymentRequestService(id: string, data: { amountRequested: number; notes: string }) {
  const currentPr = await prisma.paymentRequest.findUnique({ where: { id } });
  if (!currentPr) throw new Error("Not found");
  
  if (currentPr.status === "PAID" && currentPr.amountRequested !== data.amountRequested) {
    await syncQuoteFinancialsService(currentPr.quoteId, -currentPr.amountRequested, currentPr, true);
    const updatedPr = { ...currentPr, amountRequested: data.amountRequested };
    await syncQuoteFinancialsService(currentPr.quoteId, data.amountRequested, updatedPr);
  }

  return await prisma.paymentRequest.update({
    where: { id },
    data: {
      amountRequested: data.amountRequested,
      notes: data.notes
    }
  });
}
