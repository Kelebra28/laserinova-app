"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

/** Obtiene el ID del usuario autenticado o lanza error si no hay sesión. */
async function getSessionUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  const id = (session?.user as any)?.id as string | undefined;
  if (!id) throw new Error("No autenticado");
  return id;
}

/**
 * Genera el siguiente folio disponible de forma robusta.
 * Busca el último folio del año actual y le suma 1.
 * Si el formato cambia (e.g. año nuevo), empieza en 0001.
 */
async function generateNextFolio(): Promise<string> {
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

export async function createQuoteAction(formData: FormData) {
  const userId = await getSessionUserId();
  const clientId = formData.get("clientId") as string;
  const prospectName = (formData.get("prospectName") as string) || null;
  const project = formData.get("project") as string;
  const description = formData.get("description") as string;
  const imagesStr = formData.get("images") as string;
  const images = imagesStr ? JSON.parse(imagesStr) : [];
  
  const subtotal = parseFloat(formData.get("subtotal") as string) || 0;
  const tax = parseFloat(formData.get("iva") as string) || 0;
  const total = parseFloat(formData.get("total") as string) || 0;
  const taxable = formData.get("taxable") !== "false";
  const realCostTotal = parseFloat(formData.get("realCostTotal") as string) || 0;
  const estimatedUtility = parseFloat(formData.get("estimatedUtility") as string) || 0;

  const conceptsDataStr = formData.get("conceptsData") as string;
  const globalCostsSnapshotStr = formData.get("globalCostsSnapshot") as string;
  const saveAsClient = formData.get("saveAsClient") === "true";
  const visibleConsiderations = formData.get("visibleConsiderations") as string;
  
  if (!project || !conceptsDataStr) {
    throw new Error("Faltan datos requeridos (Proyecto y Conceptos)");
  }

  const conceptsData = JSON.parse(conceptsDataStr);
  
  // Logic to save prospect as a real client if requested
  let finalClientId = clientId || null;
  let finalProspectName = clientId ? null : (prospectName || null);

  if (saveAsClient && prospectName && !clientId) {
    const newClient = await prisma.client.create({
      data: { name: prospectName }
    });
    finalClientId = newClient.id;
    finalProspectName = null;
  }

  // Generar folio con retry para evitar race conditions (P2002)
  let quote: Awaited<ReturnType<typeof prisma.quote.create>>;
  let attempts = 0;
  while (true) {
    attempts++;
    if (attempts > 5) throw new Error("No se pudo generar un folio único. Intenta de nuevo.");
    const folio = await generateNextFolio();
    try {
      quote = await prisma.quote.create({
    data: {
      folio,
      clientId: finalClientId,
      prospectName: finalProspectName,
      userId,
      project,
      description,
      images,
      visibleConsiderations,
      status: "CALCULATED",
      taxable,
      subtotal,
      tax,
      total,
      realCostTotal,
      estimatedUtility,
      concepts: {
        create: conceptsData.map((c: any, index: number) => ({
          conceptType: c.type,
          description: c.description || `Concepto ${index + 1}`,
          quantity: Number(c.quantity) || 1,
          ...(c.materialId ? { material: { connect: { id: c.materialId } } } : {}),
          ...(c.productId ? { product: { connect: { id: c.productId } } } : {}),
          clientProvidesMaterial: Boolean(c.clientProvidesMaterial),
          width: Number(c.partWidth) || null,
          height: Number(c.partHeight) || null,
          cutTime: Number(c.timeMin) || null,
          engraveTime: null,
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
          globalValues: globalCostsSnapshotStr || "{}",
          factors: "{}", // Aquí se guardarían los custom margins de cada concepto
        }
      }
      },
    });
      break; // éxito
    } catch (err: any) {
      if (err?.code === "P2002" && err?.meta?.target === "Quote_folio_key") {
        // Folio ya tomado por otra solicitud concurrente, reintentamos
        await new Promise((r) => setTimeout(r, 50 * attempts));
        continue;
      }
      throw err;
    }
  }

  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/quotes/${quote!.id}`);
}

export async function updateQuoteAction(formData: FormData) {
  const userId = await getSessionUserId();
  const quoteId = formData.get("quoteId") as string;
  const clientId = formData.get("clientId") as string || null;
  const prospectName = (formData.get("prospectName") as string) || null;
  const saveAsClient = formData.get("saveAsClient") === "true";
  const project = formData.get("project") as string;
  const description = formData.get("description") as string;
  const imagesStr = formData.get("images") as string;
  const images = imagesStr ? JSON.parse(imagesStr) : [];
  const subtotal = parseFloat(formData.get("subtotal") as string);
  const tax = parseFloat(formData.get("tax") as string);
  const total = parseFloat(formData.get("total") as string);
  const realCostTotal = parseFloat(formData.get("realCostTotal") as string);
  const estimatedUtility = parseFloat(formData.get("estimatedUtility") as string);
  const taxable = formData.get("taxable") === "true";
  
  const conceptsData = JSON.parse(formData.get("concepts") as string);

  // Logic to save prospect as a real client if requested
  let finalClientId = clientId || null;
  let finalProspectName = clientId ? null : (prospectName || null);

  if (saveAsClient && prospectName && !clientId) {
    const newClient = await prisma.client.create({
      data: { name: prospectName }
    });
    finalClientId = newClient.id;
    finalProspectName = null;
  }

  await prisma.quote.update({
    where: { id: quoteId },
    data: {
      clientId: finalClientId,
      // Si vinculamos un cliente real, borramos el prospecto y viceversa
      prospectName: finalProspectName,
      userId,
      project,
      description,
      images,
      subtotal,
      tax,
      total,
      realCostTotal,
      estimatedUtility,
      taxable,
      concepts: {
        deleteMany: {},
        create: conceptsData.map((c: any, index: number) => ({
          conceptType: c.type,
          description: c.description || `Concepto ${index + 1}`,
          quantity: Number(c.quantity) || 1,
          ...(c.materialId ? { material: { connect: { id: c.materialId } } } : {}),
          ...(c.productId ? { product: { connect: { id: c.productId } } } : {}),
          clientProvidesMaterial: Boolean(c.clientProvidesMaterial),
          width: Number(c.partWidth) || null,
          height: Number(c.partHeight) || null,
          cutTime: Number(c.timeMin) || null,
          engraveTime: null,
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

  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/quotes/${quoteId}`);
}

export async function updateQuoteStatusAction(quoteId: string, newStatus: string) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { concepts: true }
  });

  if (!quote) return;

  let stockDeducted = quote.stockDeducted;

  if (['APPROVED', 'IN_PRODUCTION', 'DELIVERED'].includes(newStatus) && !stockDeducted) {
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
      status: newStatus,
      stockDeducted,
      ...(stockDeducted && !quote.stockDeducted ? { isDone: true } : {})
    }
  });
  
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/quotes");
  revalidatePath(`/dashboard/quotes/${quoteId}`);
}

export async function updateQuotePaymentAction(quoteId: string, type: 'unpaid' | 'partial' | 'paid') {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    select: { total: true }
  });

  if (!quote) return;

  let data: any = {};
  if (type === 'unpaid') {
    data = { paymentStatus: 'PENDING', realAmountCollected: 0, closeDate: null };
  } else if (type === 'paid') {
    data = { paymentStatus: 'PAID', realAmountCollected: quote.total, closeDate: new Date() };
  } else if (type === 'partial') {
    // Si viene de estar pagada, le ponemos un 50% por defecto para que no desaparezca
    const currentQuote = await prisma.quote.findUnique({ where: { id: quoteId } });
    const isCurrentlyPaid = currentQuote && (currentQuote.realAmountCollected || 0) >= (currentQuote.total - 0.01);
    const isCurrentlyUnpaid = currentQuote && (currentQuote.realAmountCollected || 0) === 0;
    
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

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/finance");
  revalidatePath("/dashboard/quotes");
  revalidatePath(`/dashboard/quotes/${quoteId}`);
}

export async function saveQuickQuoteAction(mockQuote: any, saveAsClient: boolean = false) {
  const userId = await getSessionUserId();
  // 1. Manejar cliente
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

  // Generar folio con retry para evitar race conditions (P2002)
  let quote: Awaited<ReturnType<typeof prisma.quote.create>>;
  let quickAttempts = 0;
  while (true) {
    quickAttempts++;
    if (quickAttempts > 5) throw new Error("No se pudo generar un folio único. Intenta de nuevo.");
    const folio = await generateNextFolio();
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
      break; // éxito
    } catch (err: any) {
      if (err?.code === "P2002" && err?.meta?.target === "Quote_folio_key") {
        await new Promise((r) => setTimeout(r, 50 * quickAttempts));
        continue;
      }
      throw err;
    }
  }

  revalidatePath("/dashboard", "layout");
  
  return { success: true, quoteId: quote!.id };
}

export async function cloneQuoteAction(
  originalQuoteId: string,
  clientId: string | null,
  prospectName: string | null,
  saveAsClient: boolean
) {
  const userId = await getSessionUserId();

  const originalQuote = await prisma.quote.findUnique({
    where: { id: originalQuoteId },
    include: {
      concepts: {
        orderBy: { order: "asc" },
      },
      snapshot: true,
    },
  });

  if (!originalQuote) {
    throw new Error("Cotización original no encontrada");
  }

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
    const folio = await generateNextFolio();
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

  revalidatePath("/dashboard", "layout");
  return { success: true, quoteId: newQuote.id };
}


