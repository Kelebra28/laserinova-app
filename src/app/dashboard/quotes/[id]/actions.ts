"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { QuoteStatus } from "@/types/prisma";

export async function updateQuoteStatus(formData: FormData) {
  const quoteId = formData.get("quoteId") as string;
  const status = formData.get("status") as QuoteStatus;

  if (!quoteId || !status) return;

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { concepts: true }
  });

  if (!quote) return;

  let stockDeducted = quote.stockDeducted;

  // Si pasa a aprobada (o posterior) y no se ha descontado stock
  if (['APPROVED', 'IN_PRODUCTION', 'DELIVERED'].includes(status) && !stockDeducted) {
    for (const concept of quote.concepts) {
      if ((concept.conceptType === 'PRODUCTO' || concept.conceptType === 'RESALE') && concept.productId) {
        await prisma.product.update({
          where: { id: concept.productId },
          data: { stockQuantity: { decrement: concept.quantity } }
        });
      }
    }
    stockDeducted = true;
  }

  await prisma.quote.update({
    where: { id: quoteId },
    data: { 
      status,
      stockDeducted,
      ...(stockDeducted && !quote.stockDeducted ? { isDone: true } : {}) // Auto-marcar como isDone si se descuenta stock
    },
  });

  revalidatePath(`/dashboard/quotes/${quoteId}`);
  revalidatePath(`/dashboard/quotes`);
  revalidatePath(`/dashboard`);
}
export async function updateQuoteConsiderations(formData: FormData) {
  const quoteId = formData.get("quoteId") as string;
  const visibleConsiderations = formData.get("visibleConsiderations") as string;

  if (!quoteId) return;

  await prisma.quote.update({
    where: { id: quoteId },
    data: { visibleConsiderations },
  });

  revalidatePath(`/dashboard/quotes/${quoteId}`);
}

export async function updateQuotePayment(formData: FormData) {
  const quoteId = formData.get("quoteId") as string;
  const realAmountCollected = parseFloat(formData.get("realAmountCollected") as string) || 0;
  const paymentStatus = formData.get("paymentStatus") as string;

  if (!quoteId) return;

  // Actualizar monto cobrado y estatus de pago
  // También calculamos la utilidad real si ya se cobró algo
  const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
  if (!quote) return;

  // Calcular la proporción de IVA en lo recolectado
  const taxPortion = quote.total > 0 ? (realAmountCollected * (quote.tax / quote.total)) : 0;
  const netCollected = realAmountCollected - taxPortion;
  const realUtilityTotal = netCollected - quote.realCostTotal;

  const isPaidOrPartial = ["PARTIAL", "PAID"].includes(paymentStatus);

  await prisma.quote.update({
    where: { id: quoteId },
    data: { 
      realAmountCollected,
      paymentStatus,
      realUtilityTotal,
      closeDate: isPaidOrPartial ? new Date() : null,
    },
  });


  revalidatePath(`/dashboard/quotes/${quoteId}`);
  revalidatePath(`/dashboard/finance`);
  revalidatePath(`/dashboard/quotes`);
  revalidatePath(`/dashboard`);
}

export async function deleteQuote(formData: FormData) {
  const quoteId = formData.get("quoteId") as string;
  if (!quoteId) return;

  await prisma.quote.delete({
    where: { id: quoteId }
  });

  revalidatePath(`/dashboard/quotes`);
  revalidatePath(`/dashboard/finance`);
  revalidatePath(`/dashboard`);
  redirect(`/dashboard/quotes`);
}

export async function duplicateQuoteAsVersion(quoteId: string) {
  if (!quoteId) return;

  const originalQuote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { concepts: true }
  });

  if (!originalQuote) return;

  // Determine the version group ID. If it doesn't exist, the original becomes the root of the group.
  const versionGroupId = originalQuote.versionGroupId || originalQuote.id;

  // Update original quote to be Option 1 if it wasn't grouped yet
  if (!originalQuote.versionGroupId) {
    await prisma.quote.update({
      where: { id: originalQuote.id },
      data: { versionGroupId, versionName: "Opción 1" }
    });
  }

  // Count existing versions in this group to name the new one
  const existingVersionsCount = await prisma.quote.count({
    where: { versionGroupId }
  });

  const newVersionName = `Opción ${existingVersionsCount + 1}`;
  
  // Generate a unique folio
  const baseFolio = originalQuote.folio.split('-OP')[0];
  const newFolio = `${baseFolio}-OP${existingVersionsCount + 1}`;

  // Create the new quote
  const newQuote = await prisma.quote.create({
    data: {
      folio: newFolio,
      clientId: originalQuote.clientId,
      prospectName: originalQuote.prospectName,
      userId: originalQuote.userId,
      project: originalQuote.project,
      description: originalQuote.description,
      status: "DRAFT", // New options start as draft
      paymentStatus: "PENDING",
      taxable: originalQuote.taxable,
      subtotal: originalQuote.subtotal,
      tax: originalQuote.tax,
      total: originalQuote.total,
      realCostTotal: originalQuote.realCostTotal,
      estimatedUtility: originalQuote.estimatedUtility,
      deliveryTime: originalQuote.deliveryTime,
      validityDays: originalQuote.validityDays,
      paymentConditions: originalQuote.paymentConditions,
      internalNotes: originalQuote.internalNotes,
      visibleConsiderations: originalQuote.visibleConsiderations,
      versionGroupId: versionGroupId,
      versionName: newVersionName,
      concepts: {
        create: originalQuote.concepts.map(c => ({
          conceptType: c.conceptType,
          description: c.description,
          quantity: c.quantity,
          materialId: c.materialId,
          clientProvidesMaterial: c.clientProvidesMaterial,
          width: c.width,
          height: c.height,
          thickness: c.thickness,
          cutTime: c.cutTime,
          engraveTime: c.engraveTime,
          machineType: c.machineType,
          details: c.details,
          serviceDays: c.serviceDays,
          serviceHours: c.serviceHours,
          transportCost: c.transportCost,
          materialCost: c.materialCost,
          productionCost: c.productionCost,
          realCost: c.realCost,
          margin: c.margin,
          suggestedPrice: c.suggestedPrice,
          finalUnitPrice: c.finalUnitPrice,
          totalAmount: c.totalAmount,
          order: c.order,
        }))
      }
    }
  });

  revalidatePath(`/dashboard/quotes`);
  redirect(`/dashboard/quotes/${newQuote.id}/edit`);
}

export async function approveQuoteVersion(groupId: string, approvedQuoteId: string) {
  if (!groupId || !approvedQuoteId) return;

  // 1. Mark the selected one as APPROVED
  await prisma.quote.update({
    where: { id: approvedQuoteId },
    data: { status: "APPROVED" }
  });

  // 2. Mark all other siblings as REJECTED
  await prisma.quote.updateMany({
    where: { 
      versionGroupId: groupId,
      id: { not: approvedQuoteId }
    },
    data: { status: "REJECTED" }
  });

  revalidatePath(`/dashboard/quotes`);
  revalidatePath(`/dashboard/finance`);
  revalidatePath(`/dashboard/quotes/${approvedQuoteId}`);
}
