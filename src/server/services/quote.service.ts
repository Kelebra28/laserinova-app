import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface GetQuotesParams {
  search?: string;
  month?: string;
  clientId?: string;
  status?: string;
  page?: string;
  limit?: string;
}

export async function getQuotesListService(params: GetQuotesParams) {
  const { search, month, clientId, status, page, limit } = params;

  const defaultMonth = "all";
  const targetMonth = month !== undefined ? month : defaultMonth;
  
  let dateFilter = {};
  if (targetMonth && targetMonth !== "all") {
    const [year, m] = targetMonth.split("-").map(Number);
    const startDate = new Date(year, m - 1, 1);
    const endDate = new Date(year, m, 0, 23, 59, 59, 999);
    
    dateFilter = {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    };
  }

  const whereClause: Prisma.QuoteWhereInput = {
    ...(search ? {
      OR: [
        { folio: { contains: search } },
        { client: { name: { contains: search } } },
        { client: { company: { contains: search } } },
        { project: { contains: search } },
      ]
    } : {}),
    ...(clientId && clientId !== "all" ? { clientId } : {}),
    ...(status && status !== "all" ? { status: status as any } : {}),
    ...dateFilter
  };

  const currentPage = Math.max(1, parseInt(page || "1", 10));
  const itemsPerPage = Math.max(1, parseInt(limit || "10", 10));
  const skip = (currentPage - 1) * itemsPerPage;

  const [totalItems, quotes] = await Promise.all([
    prisma.quote.count({ where: whereClause }),
    prisma.quote.findMany({
      where: whereClause,
      include: {
        client: true,
        user: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: itemsPerPage,
    })
  ]);

  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  return {
    quotes,
    totalItems,
    totalPages,
    currentPage,
    itemsPerPage,
    defaultMonth
  };
}

export async function getActiveQuotesKanbanService() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const startDate = new Date(currentYear, currentMonth, 1);
  const endDate = new Date(currentYear, currentMonth + 1, 0);

  const activeQuotes = await prisma.quote.findMany({
    where: {
      active: true,
      OR: [
        { createdAt: { gte: startDate, lte: endDate } },
        { updatedAt: { gte: startDate, lte: endDate } },
        { status: { notIn: ["DELIVERED", "CANCELLED", "REJECTED"] } }
      ]
    },
    include: {
      client: true
    },
    orderBy: {
      updatedAt: 'desc'
    }
  });

  return activeQuotes;
}

export async function getClientsForFiltersService() {
  const clients = await prisma.client.findMany({
    select: { id: true, name: true, company: true },
    orderBy: { name: 'asc' }
  });
  return clients;
}

export async function getQuoteDetailService(quoteId: string) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      client: true,
      user: true,
      concepts: {
        orderBy: { order: 'asc' },
        include: { material: true }
      }
    }
  });

  if (!quote) return null;

  let versions = [quote];
  if (quote.versionGroupId) {
    versions = await prisma.quote.findMany({
      where: { versionGroupId: quote.versionGroupId },
      select: { id: true, versionName: true, status: true, total: true, folio: true },
      orderBy: { createdAt: 'asc' }
    }) as any;
  }

  return { quote, versions };
}

export async function getActiveClientsService() {
  return await prisma.client.findMany({
    where: { active: true },
    orderBy: { name: "asc" }
  });
}

export async function getQuoteEditDataService(quoteId: string) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      concepts: {
        include: { material: true }
      }
    }
  });

  if (!quote) return null;

  let versions = [quote];
  if (quote.versionGroupId) {
    versions = await prisma.quote.findMany({
      where: { versionGroupId: quote.versionGroupId },
      select: { id: true, versionName: true, status: true, total: true, folio: true },
      orderBy: { createdAt: 'asc' }
    }) as any;
  }

  const materials = await prisma.material.findMany({
    where: { active: true },
    include: { category: true },
    orderBy: { name: "asc" }
  });

  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { name: "asc" }
  });

  const globalCosts = await prisma.costConfiguration.findMany({
    where: { active: true }
  });

  const globalCostsObj: Record<string, number> = {};
  globalCosts.forEach(c => {
    globalCostsObj[c.key] = c.value;
  });

  const safeGlobals = {
    costo_minuto_mayoreo: globalCostsObj["costo_minuto_mayoreo"] || 8.5,
    costo_minuto_menudeo: globalCostsObj["costo_minuto_menudeo"] || 10,
    porcentaje_iva: globalCostsObj["porcentaje_iva"] || 16,
    factor_guarda_default: globalCostsObj["factor_guarda_default"] || 1.2,
    margen_default: globalCostsObj["margen_default"] || 50,
    factor_produccion_default: globalCostsObj["factor_produccion_default"] || 3,
    precio_tubo: globalCostsObj["precio_tubo"] || 250000,
    vida_util_tubo: globalCostsObj["vida_util_tubo"] || 6000,
    factor_miedo: globalCostsObj["factor_miedo"] || 2,
    porcentaje_transporte_material: globalCostsObj["porcentaje_transporte_material"] || 20,
    porcentaje_merma_corte: globalCostsObj["porcentaje_merma_corte"] || 20,
  };

  return { quote, versions, materials, products, safeGlobals };
}

export async function updateQuoteStatusService(quoteId: string, status: string) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { concepts: true }
  });

  if (!quote) throw new Error("Cotización no encontrada");

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
      status: status as any,
      stockDeducted,
      ...(stockDeducted && !quote.stockDeducted ? { isDone: true } : {}) 
    },
  });
  return true;
}

export async function updateQuoteConsiderationsService(quoteId: string, visibleConsiderations: string) {
  await prisma.quote.update({
    where: { id: quoteId },
    data: { visibleConsiderations },
  });
  return true;
}

export async function updateQuotePaymentService(quoteId: string, realAmountCollected: number, paymentStatus: string) {
  const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
  if (!quote) throw new Error("Cotización no encontrada");

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
  return true;
}

export async function deleteQuoteService(quoteId: string) {
  await prisma.quote.delete({
    where: { id: quoteId }
  });
  return true;
}

export async function duplicateQuoteAsVersionService(quoteId: string) {
  const originalQuote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { concepts: true }
  });

  if (!originalQuote) throw new Error("Cotización no encontrada");

  const versionGroupId = originalQuote.versionGroupId || originalQuote.id;

  if (!originalQuote.versionGroupId) {
    await prisma.quote.update({
      where: { id: originalQuote.id },
      data: { versionGroupId, versionName: "Opción 1" }
    });
  }

  const existingVersionsCount = await prisma.quote.count({
    where: { versionGroupId }
  });

  const newVersionName = `Opción ${existingVersionsCount + 1}`;
  const baseFolio = originalQuote.folio.split('-OP')[0];
  const newFolio = `${baseFolio}-OP${existingVersionsCount + 1}`;

  const newQuote = await prisma.quote.create({
    data: {
      folio: newFolio,
      clientId: originalQuote.clientId,
      prospectName: originalQuote.prospectName,
      userId: originalQuote.userId,
      project: originalQuote.project,
      description: originalQuote.description,
      status: "DRAFT",
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

  return newQuote.id;
}

export async function approveQuoteVersionService(groupId: string, approvedQuoteId: string) {
  await prisma.quote.update({
    where: { id: approvedQuoteId },
    data: { status: "APPROVED" }
  });

  await prisma.quote.updateMany({
    where: { 
      versionGroupId: groupId,
      id: { not: approvedQuoteId }
    },
    data: { status: "REJECTED" }
  });
  
  return true;
}

export async function generateNextFolioService(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `LI-${year}-`;
  const lastQuote = await prisma.quote.findFirst({
    where: { folio: { startsWith: prefix } },
    orderBy: { folio: "desc" },
    select: { folio: true },
  });
  let nextNumber = 1;
  if (lastQuote) {
    const lastNumber = parseInt(lastQuote.folio.replace(prefix, ""), 10);
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }
  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
}

export async function createQuoteService(userId: string, data: any) {
  let finalClientId = data.clientId || null;
  let finalProspectName = data.clientId ? null : (data.prospectName || null);

  if (data.saveAsClient && data.prospectName && !data.clientId) {
    const newClient = await prisma.client.create({
      data: { name: data.prospectName }
    });
    finalClientId = newClient.id;
    finalProspectName = null;
  }

  let quote: any;
  let attempts = 0;
  while (true) {
    attempts++;
    if (attempts > 5) throw new Error("No se pudo generar un folio único. Intenta de nuevo.");
    const folio = await generateNextFolioService();
    try {
      quote = await prisma.quote.create({
        data: {
          folio,
          clientId: finalClientId,
          prospectName: finalProspectName,
          userId,
          project: data.project,
          description: data.description,
          images: data.images,
          visibleConsiderations: data.visibleConsiderations,
          status: "CALCULATED",
          taxable: data.taxable,
          subtotal: data.subtotal,
          tax: data.tax,
          total: data.total,
          realCostTotal: data.realCostTotal,
          estimatedUtility: data.estimatedUtility,
          concepts: {
            create: data.conceptsData.map((c: any, index: number) => ({
              conceptType: c.type,
              description: c.description || `Concepto ${index + 1}`,
              quantity: Number(c.quantity) || 1,
              ...(c.materialId ? { material: { connect: { id: c.materialId } } } : {}),
              ...(c.productId ? { product: { connect: { id: c.productId } } } : {}),
              clientProvidesMaterial: Boolean(c.clientProvidesMaterial),
              width: Number(c.partWidth) || null,
              height: Number(c.partHeight) || null,
              cutTime: Number(c.timeMin) || null,
              finalUnitPrice: Number(c.calculated?.finalUnitPrice ?? c.finalUnitPrice ?? 0),
              totalAmount: Number(c.calculated?.totalAmount ?? c.totalAmount ?? 0),
              realCost: Number(c.calculated?.realCost ?? c.realCost ?? 0),
              suggestedPrice: Number(c.calculated?.suggestedPrice ?? c.suggestedPrice ?? 0),
              materialCost: Number(c.calculated?.materialCost ?? c.materialCost ?? 0),
              productionCost: Number(c.calculated?.productionCost ?? c.productionCost ?? 0),
              serviceDays: Number(c.serviceDays || 0),
              serviceHours: Number(c.serviceHours || 0),
              transportCost: Number(c.transportCost || 0),
              details: c.details || null,
              order: index,
            })),
          },
          snapshot: {
            create: {
              globalValues: data.globalCostsSnapshotStr || "{}",
              factors: "{}", 
            }
          }
        },
      });
      break; 
    } catch (err: any) {
      if (err?.code === "P2002" && err?.meta?.target === "Quote_folio_key") {
        await new Promise((r) => setTimeout(r, 50 * attempts));
        continue;
      }
      throw err;
    }
  }

  try {
    let tag = await prisma.taskTag.findUnique({ where: { name: "Seguimiento" } });
    if (!tag) {
      tag = await prisma.taskTag.create({ data: { name: "Seguimiento", color: "blue" } });
    }
    await prisma.task.create({
      data: {
        title: `Seguimiento de Cotización - ${quote.folio}`,
        description: `Cotización recién creada para el proyecto: ${data.project}.`,
        status: "PENDING",
        priority: "NORMAL",
        createdById: userId,
        tags: { connect: [{ id: tag.id }] },
        assignees: {
          create: [{ userId: userId }]
        }
      }
    });
  } catch (taskErr) {
    console.error("No se pudo crear la tarea de seguimiento:", taskErr);
  }

  return quote.id;
}

export async function updateQuoteDataService(userId: string, quoteId: string, data: any) {
  let finalClientId = data.clientId || null;
  let finalProspectName = data.clientId ? null : (data.prospectName || null);

  if (data.saveAsClient && data.prospectName && !data.clientId) {
    const newClient = await prisma.client.create({
      data: { name: data.prospectName }
    });
    finalClientId = newClient.id;
    finalProspectName = null;
  }

  await prisma.quote.update({
    where: { id: quoteId },
    data: {
      clientId: finalClientId,
      prospectName: finalProspectName,
      userId,
      project: data.project,
      description: data.description,
      images: data.images,
      subtotal: data.subtotal,
      tax: data.tax,
      total: data.total,
      realCostTotal: data.realCostTotal,
      estimatedUtility: data.estimatedUtility,
      taxable: data.taxable,
      concepts: {
        deleteMany: {},
        create: data.conceptsData.map((c: any, index: number) => ({
          conceptType: c.type,
          description: c.description || `Concepto ${index + 1}`,
          quantity: Number(c.quantity) || 1,
          ...(c.materialId ? { material: { connect: { id: c.materialId } } } : {}),
          ...(c.productId ? { product: { connect: { id: c.productId } } } : {}),
          clientProvidesMaterial: Boolean(c.clientProvidesMaterial),
          width: Number(c.partWidth) || null,
          height: Number(c.partHeight) || null,
          cutTime: Number(c.timeMin) || null,
          finalUnitPrice: Number(c.calculated?.finalUnitPrice ?? c.finalUnitPrice ?? 0),
          totalAmount: Number(c.calculated?.totalAmount ?? c.totalAmount ?? 0),
          realCost: Number(c.calculated?.realCost ?? c.realCost ?? 0),
          suggestedPrice: Number(c.calculated?.suggestedPrice ?? c.suggestedPrice ?? 0),
          materialCost: Number(c.calculated?.materialCost ?? c.materialCost ?? 0),
          productionCost: Number(c.calculated?.productionCost ?? c.productionCost ?? 0),
          serviceDays: Number(c.serviceDays || 0),
          serviceHours: Number(c.serviceHours || 0),
          transportCost: Number(c.transportCost || 0),
          details: c.details || null,
          order: index,
        })),
      }
    }
  });

  return true;
}

export async function createQuickQuoteService(userId: string, mockQuote: any, saveAsClient: boolean = false) {
  let finalClientId = mockQuote.clientId || null;
  let finalProspectName = finalClientId ? null : (mockQuote.client.name || null);

  if (!finalClientId && mockQuote.client.name) {
    const existingClient = await prisma.client.findFirst({
      where: { name: mockQuote.client.name }
    });

    if (existingClient) {
      finalClientId = existingClient.id;
      finalProspectName = null;
    } else if (saveAsClient) {
      const newClient = await prisma.client.create({
        data: {
          name: mockQuote.client.name,
          company: mockQuote.client.company || null,
        }
      });
      finalClientId = newClient.id;
      finalProspectName = null;
    }
  }

  let quote: any;
  let quickAttempts = 0;
  while (true) {
    quickAttempts++;
    if (quickAttempts > 5) throw new Error("No se pudo generar un folio único. Intenta de nuevo.");
    const folio = await generateNextFolioService();
    try {
      quote = await prisma.quote.create({
        data: {
          folio,
          clientId: finalClientId,
          prospectName: finalProspectName,
          userId,
          project: mockQuote.project || "Cotización Libre",
          description: mockQuote.description,
          status: "APPROVED",
          subtotal: mockQuote.subtotal,
          tax: mockQuote.tax,
          total: mockQuote.total,
          realCostTotal: mockQuote.concepts.reduce((sum: number, c: any) => {
            const price = (Number(c.quantity) || 0) * (Number(c.unitPrice) || 0);
            const margin = (Number(c.margin) || 0) / 100;
            const cost = price * (1 - margin);
            return sum + cost;
          }, 0),
          estimatedUtility: mockQuote.concepts.reduce((sum: number, c: any) => {
            const price = (Number(c.quantity) || 0) * (Number(c.unitPrice) || 0);
            const margin = (Number(c.margin) || 0) / 100;
            return sum + (price * margin);
          }, 0),
          concepts: {
            create: mockQuote.concepts.map((c: any, index: number) => ({
              conceptType: "OTRO",
              description: c.description || `Concepto Libre ${index + 1}`,
              quantity: Number(c.quantity) || 1,
              finalUnitPrice: Number(c.unitPrice) || 0,
              totalAmount: Number(c.totalAmount) || 0,
              margin: Number(c.margin) || 0,
              realCost: (Number(c.totalAmount) || 0) * (1 - (Number(c.margin) || 0) / 100),
              suggestedPrice: Number(c.totalAmount) || 0,
              details: c.details || null,
              order: index,
            })),
          },
          snapshot: {
            create: {
              globalValues: "{}",
              factors: "{}",
            }
          }
        },
      });
      break; 
    } catch (err: any) {
      if (err?.code === "P2002" && err?.meta?.target === "Quote_folio_key") {
        await new Promise((r) => setTimeout(r, 50 * quickAttempts));
        continue;
      }
      throw err;
    }
  }

  return quote.id;
}

export async function cloneQuoteFullService(userId: string, originalQuoteId: string, clientId: string | null, prospectName: string | null, saveAsClient: boolean) {
  const originalQuote = await prisma.quote.findUnique({
    where: { id: originalQuoteId },
    include: {
      concepts: { orderBy: { order: "asc" } },
      snapshot: true,
    },
  });

  if (!originalQuote) throw new Error("Cotización original no encontrada");

  let finalClientId = clientId || null;
  let finalProspectName = clientId ? null : (prospectName || null);

  if (saveAsClient && prospectName && !clientId) {
    const newClient = await prisma.client.create({
      data: { name: prospectName }
    });
    finalClientId = newClient.id;
    finalProspectName = null;
  }

  let newQuote: any;
  let attempts = 0;
  while (true) {
    attempts++;
    if (attempts > 5) throw new Error("No se pudo generar un folio único. Intenta de nuevo.");
    const folio = await generateNextFolioService();
    try {
      newQuote = await prisma.quote.create({
        data: {
          folio,
          clientId: finalClientId,
          prospectName: finalProspectName,
          userId,
          project: originalQuote.project,
          description: originalQuote.description,
          status: originalQuote.status === "APPROVED" ? "APPROVED" : "CALCULATED",
          paymentStatus: "PENDING",
          taxable: originalQuote.taxable,
          subtotal: originalQuote.subtotal,
          tax: originalQuote.tax,
          total: originalQuote.total,
          realCostTotal: originalQuote.realCostTotal,
          estimatedUtility: originalQuote.estimatedUtility,
          realAmountCollected: 0,
          realUtilityTotal: 0,
          isDone: false,
          sentDate: null,
          closeDate: null,
          deliveryTime: originalQuote.deliveryTime,
          validityDays: originalQuote.validityDays,
          paymentConditions: originalQuote.paymentConditions,
          visibleConsiderations: originalQuote.visibleConsiderations,
          concepts: {
            create: originalQuote.concepts.map((c, index) => ({
              conceptType: c.conceptType,
              description: c.description,
              quantity: c.quantity,
              materialId: c.materialId,
              clientProvidesMaterial: c.clientProvidesMaterial,
              width: c.width,
              height: c.height,
              cutTime: c.cutTime,
              engraveTime: c.engraveTime,
              finalUnitPrice: c.finalUnitPrice,
              totalAmount: c.totalAmount,
              realCost: c.realCost,
              suggestedPrice: c.suggestedPrice,
              materialCost: c.materialCost,
              productionCost: c.productionCost,
              serviceDays: c.serviceDays,
              serviceHours: c.serviceHours,
              transportCost: c.transportCost,
              details: c.details,
              order: index,
            })),
          },
          ...(originalQuote.snapshot
            ? {
                snapshot: {
                  create: {
                    globalValues: originalQuote.snapshot.globalValues,
                    factors: originalQuote.snapshot.factors,
                    intermediate: originalQuote.snapshot.intermediate,
                  },
                },
              }
            : {}),
        },
      });
      break;
    } catch (err: any) {
      if (err?.code === "P2002" && err?.meta?.target === "Quote_folio_key") {
        await new Promise((r) => setTimeout(r, 50 * attempts));
        continue;
      }
      throw err;
    }
  }

  return newQuote.id;
}

export async function updateQuotePaymentKanbanService(quoteId: string, type: 'unpaid' | 'partial' | 'paid') {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    select: { total: true, realAmountCollected: true }
  });

  if (!quote) throw new Error("Cotización no encontrada");

  let data: any = {};
  if (type === 'unpaid') {
    data = { paymentStatus: 'PENDING', realAmountCollected: 0, closeDate: null };
  } else if (type === 'paid') {
    data = { paymentStatus: 'PAID', realAmountCollected: quote.total, closeDate: new Date() };
  } else if (type === 'partial') {
    const currentCollected = quote.realAmountCollected || 0;
    const isCurrentlyPaid = currentCollected >= (quote.total - 0.01);
    const isCurrentlyUnpaid = currentCollected === 0;
    
    data = { 
      paymentStatus: 'PARTIAL',
      realAmountCollected: isCurrentlyPaid ? (quote.total / 2) : (isCurrentlyUnpaid ? (quote.total / 2) : undefined),
      closeDate: new Date()
    };
  }

  await prisma.quote.update({
    where: { id: quoteId },
    data
  });

  return true;
}
