"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { 
  getQuotesListService, 
  getActiveQuotesKanbanService, 
  getClientsForFiltersService,
  getQuotesSummaryService,
  GetQuotesParams,
  updateQuoteStatusService,
  updateQuoteConsiderationsService,
  updateQuotePaymentService,
  deleteQuoteService,
  duplicateQuoteAsVersionService,
  approveQuoteVersionService,
  createQuoteService,
  updateQuoteDataService,
  createQuickQuoteService,
  cloneQuoteFullService,
  updateQuotePaymentKanbanService,
} from "../services/quote.service";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generateQuotePDF } from "@/lib/pdf";
import fs from "fs";
import path from "path";
import { processAIAgentResponse, sendQuotePdfToClient, getContactWindow, quoteTemplateConfigured } from "../services/whatsapp.service";
import { notificationEmitter } from "@/lib/notification-emitter";
import { after } from "next/server";
import { buildGlobalCosts } from "@/lib/pricing";
import { encodeQuoteLink } from "@/lib/whatsapp/internal-message";
import { isSimulatorContact } from "@/constants/whatsapp";

async function requireAuth(allowedRoles?: string[]) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user?.id) {
    throw new Error("No autorizado");
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw new Error("Acceso denegado: Privilegios insuficientes");
  }
  return user;
}

export async function getQuotesList(params: GetQuotesParams) {
  try {
    await requireAuth();
    const data = await getQuotesListService(params);
    return { success: true, data };
  } catch (error: any) {
    console.error("Error fetching quotes list:", error);
    return { success: false, error: error.message || "Error al obtener lista de cotizaciones" };
  }
}

export async function getQuotesSummary() {
  try {
    await requireAuth();
    const data = await getQuotesSummaryService();
    return { success: true, data };
  } catch (error: any) {
    console.error("Error fetching quotes summary:", error);
    return { success: false, error: error.message || "Error al obtener el resumen" };
  }
}

export async function getActiveQuotesKanban() {
  try {
    await requireAuth();
    const data = await getActiveQuotesKanbanService();
    return { success: true, data };
  } catch (error: any) {
    console.error("Error fetching active quotes:", error);
    return { success: false, error: error.message || "Error al obtener cotizaciones activas" };
  }
}

export async function getClientsForFilters() {
  try {
    await requireAuth();
    const data = await getClientsForFiltersService();
    return { success: true, data };
  } catch (error: any) {
    console.error("Error fetching clients for filters:", error);
    return { success: false, error: error.message || "Error al obtener clientes para filtros" };
  }
}

export async function updateQuoteStatus(formData: FormData) {
  await requireAuth();
  const quoteId = formData.get("quoteId") as string;
  const status = formData.get("status") as string;
  if (!quoteId || !status) throw new Error("Datos incompletos");
  
  await updateQuoteStatusService(quoteId, status);
  revalidatePath(`/dashboard/quotes/${quoteId}`);
  revalidatePath(`/dashboard/quotes`);
  revalidatePath(`/dashboard`);
}

export async function updateQuoteConsiderations(formData: FormData) {
  await requireAuth();
  const quoteId = formData.get("quoteId") as string;
  const visibleConsiderations = formData.get("visibleConsiderations") as string;
  if (!quoteId) throw new Error("Datos incompletos");

  await updateQuoteConsiderationsService(quoteId, visibleConsiderations);
  revalidatePath(`/dashboard/quotes/${quoteId}`);
}

export async function updateQuotePayment(formData: FormData) {
  await requireAuth();
  const quoteId = formData.get("quoteId") as string;
  const realAmountCollected = parseFloat(formData.get("realAmountCollected") as string) || 0;
  const paymentStatus = formData.get("paymentStatus") as string;
  if (!quoteId) throw new Error("Datos incompletos");

  await updateQuotePaymentService(quoteId, realAmountCollected, paymentStatus);
  revalidatePath(`/dashboard/quotes/${quoteId}`);
  revalidatePath(`/dashboard/finance`);
  revalidatePath(`/dashboard/quotes`);
  revalidatePath(`/dashboard`);
}

export async function deleteQuote(formData: FormData) {
  await requireAuth();
  const quoteId = formData.get("quoteId") as string;
  if (!quoteId) throw new Error("Datos incompletos");

  await deleteQuoteService(quoteId);
  revalidatePath(`/dashboard/quotes`);
  revalidatePath(`/dashboard/finance`);
  revalidatePath(`/dashboard`);
  redirect(`/dashboard/quotes`);
}

export async function deleteQuoteAction(quoteId: string) {
  try {
    await requireAuth();
    if (!quoteId || typeof quoteId !== "string") {
      return { success: false, error: "ID de cotización no válido" };
    }

    await deleteQuoteService(quoteId);
    revalidatePath(`/dashboard/quotes`);
    revalidatePath(`/dashboard/finance`);
    revalidatePath(`/dashboard`);
    return { success: true, data: { id: quoteId } };
  } catch (error: any) {
    console.error("Error al eliminar cotización:", error);
    return { success: false, error: error.message || "Error al eliminar la cotización" };
  }
}

export async function duplicateQuoteAsVersion(quoteId: string) {
  try {
    await requireAuth();
    if (!quoteId) throw new Error("Datos incompletos");
    
    const newId = await duplicateQuoteAsVersionService(quoteId);
    revalidatePath(`/dashboard/quotes`);
    return { success: true, redirectUrl: `/dashboard/quotes/${newId}/edit` };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

const createQuoteSchema = z.object({
  clientId: z.string().nullable().optional(),
  contactId: z.string().nullable().optional(),
  prospectName: z.string().nullable().optional(),
  prospectEmail: z.string().nullable().optional(),
  prospectPhone: z.string().nullable().optional(),
  project: z.string().min(1, "El proyecto es requerido"),
  description: z.string(),
  imagesStr: z.string(),
  images: z.array(z.string()),
  subtotal: z.number(),
  tax: z.number(),
  total: z.number(),
  taxable: z.boolean(),
  showTotal: z.boolean().default(true),
  realCostTotal: z.number(),
  estimatedUtility: z.number(),
  conceptsDataStr: z.string(),
  conceptsData: z.array(z.any()), // Idealmente requerir schema por cada concepto
  globalCostsSnapshotStr: z.string().optional(),
  saveAsClient: z.boolean(),
  visibleConsiderations: z.string().optional(),
});

export async function approveQuoteVersion(groupId: string, approvedQuoteId: string) {
  await requireAuth();
  if (!groupId || !approvedQuoteId) throw new Error("Datos incompletos");

  await approveQuoteVersionService(groupId, approvedQuoteId);
  revalidatePath(`/dashboard/quotes`);
  revalidatePath(`/dashboard/finance`);
  revalidatePath(`/dashboard/quotes/${approvedQuoteId}`);
}

export async function createQuoteAction(formData: FormData) {
  try {
    const user = await requireAuth();
    
    const rawData = {
      clientId: formData.get("clientId") as string || null,
      contactId: formData.get("contactId") as string || null,
      prospectName: (formData.get("prospectName") as string) || null,
      prospectEmail: (formData.get("prospectEmail") as string) || null,
      prospectPhone: (formData.get("prospectPhone") as string) || null,
      project: formData.get("project") as string,
      description: (formData.get("description") as string) || "",
      imagesStr: (formData.get("images") as string) || "",
      images: formData.get("images") ? JSON.parse(formData.get("images") as string) : [],
      subtotal: parseFloat(formData.get("subtotal") as string) || 0,
      tax: parseFloat((formData.get("tax") as string) || (formData.get("iva") as string)) || 0,
      total: parseFloat(formData.get("total") as string) || 0,
      taxable: formData.get("taxable") !== "false",
      showTotal: formData.get("showTotal") !== "false",
      realCostTotal: parseFloat(formData.get("realCostTotal") as string) || 0,
      estimatedUtility: parseFloat(formData.get("estimatedUtility") as string) || 0,
      conceptsDataStr: formData.get("conceptsData") as string || "[]",
      conceptsData: JSON.parse(formData.get("conceptsData") as string || "[]"),
      globalCostsSnapshotStr: formData.get("globalCostsSnapshot") as string || "",
      saveAsClient: formData.get("saveAsClient") === "true",
      visibleConsiderations: formData.get("visibleConsiderations") as string || "",
    };

    const data = createQuoteSchema.parse(rawData);

    if (!data.project || data.conceptsData.length === 0) {
      return { success: false, error: "Faltan datos requeridos (Proyecto y Conceptos)" };
    }

    const quoteId = await createQuoteService(user.id, data as any);

    const contactId = formData.get("contactId") as string;
    if (contactId) {
      try {
        await prisma.whatsAppMessage.create({
          data: {
            contactId,
            messageId: `internal_quote_${Date.now()}`,
            direction: 'INTERNAL',
            type: 'TEXT',
            content: `Cotización Creada Exitosamente. Puedes verla dando clic en el botón.${encodeQuoteLink(quoteId)}`,
            status: 'DELIVERED'
          }
        });
      } catch (e) {
        console.error("Error creating internal message for quote creation:", e);
      }
    }

    const whatsappMessageId = formData.get("whatsappMessageId") as string;
    if (whatsappMessageId) {
      try {
        await prisma.whatsAppMessage.update({
          where: { id: whatsappMessageId },
          data: {
            content: `Cotización Creada Exitosamente. ${encodeQuoteLink(quoteId)}`
          }
        });
      } catch (e) {
        console.error("Error updating original WhatsApp message:", e);
      }
    }

    revalidatePath("/dashboard", "layout");
    return { success: true, quoteId };
  } catch (error: any) {
    if (error.message === 'NEXT_REDIRECT') throw error;
    return { success: false, error: error.message || "Error al crear la cotización" };
  }
}

const updateQuoteSchema = z.object({
  clientId: z.string().nullable().optional(),
  prospectName: z.string().nullable().optional(),
  saveAsClient: z.boolean(),
  project: z.string().min(1, "El proyecto es requerido"),
  description: z.string(),
  imagesStr: z.string(),
  images: z.array(z.string()),
  subtotal: z.number(),
  tax: z.number(),
  total: z.number(),
  realCostTotal: z.number(),
  estimatedUtility: z.number(),
  taxable: z.boolean(),
  showTotal: z.boolean().default(true),
  conceptsData: z.array(z.any()),
});

export async function updateQuoteAction(formData: FormData) {
  try {
    const quoteId = formData.get("quoteId") as string;
    const user = await requireAuth();
    const rawData = {
      clientId: formData.get("clientId") as string || null,
      prospectName: (formData.get("prospectName") as string) || null,
      saveAsClient: formData.get("saveAsClient") === "true",
      project: formData.get("project") as string,
      description: (formData.get("description") as string) || "",
      imagesStr: (formData.get("images") as string) || "",
      images: formData.get("images") ? JSON.parse(formData.get("images") as string) : [],
      subtotal: parseFloat(formData.get("subtotal") as string) || 0,
      tax: parseFloat(formData.get("tax") as string) || 0,
      total: parseFloat(formData.get("total") as string) || 0,
      realCostTotal: parseFloat(formData.get("realCostTotal") as string) || 0,
      estimatedUtility: parseFloat(formData.get("estimatedUtility") as string) || 0,
      taxable: formData.get("taxable") === "true",
      showTotal: formData.get("showTotal") !== "false",
      conceptsData: JSON.parse(formData.get("concepts") as string || "[]"),
    };

    const data = updateQuoteSchema.parse(rawData);

    await updateQuoteDataService(user.id, quoteId, data as any);
    revalidatePath("/dashboard", "layout");
    return { success: true, quoteId };
  } catch (error: any) {
    if (error.message === 'NEXT_REDIRECT') throw error;
    return { success: false, error: error.message || "Error al actualizar la cotización" };
  }
}

export async function saveQuickQuoteAction(mockQuote: any, saveAsClient: boolean = false) {
  try {
    const user = await requireAuth();
    const quoteId = await createQuickQuoteService(user.id, mockQuote, saveAsClient);
    revalidatePath("/dashboard", "layout");
    return { success: true, quoteId };
  } catch (error: any) {
    if (error.message === 'NEXT_REDIRECT') throw error;
    return { success: false, error: error.message };
  }
}

export async function cloneQuoteAction(originalQuoteId: string, clientId: string | null, prospectName: string | null, saveAsClient: boolean) {
  try {
    const user = await requireAuth();
    const quoteId = await cloneQuoteFullService(user.id, originalQuoteId, clientId, prospectName, saveAsClient);
    revalidatePath("/dashboard", "layout");
    return { success: true, quoteId };
  } catch (error: any) {
    if (error.message === 'NEXT_REDIRECT') throw error;
    return { success: false, error: error.message };
  }
}

export async function updateQuoteStatusAction(quoteId: string, newStatus: string) {
  await requireAuth();
  await updateQuoteStatusService(quoteId, newStatus);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/quotes");
  revalidatePath(`/dashboard/quotes/${quoteId}`);
}

export async function updateQuotePaymentAction(quoteId: string, type: 'unpaid' | 'partial' | 'paid') {
  await requireAuth();
  await updateQuotePaymentKanbanService(quoteId, type);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/finance");
  revalidatePath("/dashboard/quotes");
  revalidatePath(`/dashboard/quotes/${quoteId}`);
}

/**
 * Antes de mandar una cotización por WhatsApp: ¿sigue abierta la ventana de 24 h del cliente?
 * Si no, el botón avisa que se irá con la plantilla (o que no se puede enviar sin ella).
 */
export async function getQuoteWhatsAppWindowAction(quoteId: string) {
  await requireAuth();
  const quote = await prisma.quote.findUnique({ where: { id: quoteId }, select: { contactId: true, clientId: true } });
  if (!quote || (!quote.contactId && !quote.clientId)) return { found: false as const };
  const contact = await prisma.whatsAppContact.findFirst({
    where: quote.contactId ? { id: quote.contactId } : { clientId: quote.clientId },
    select: { id: true, name: true },
  });
  if (!contact) return { found: false as const };
  const { open, lastInboundAt } = await getContactWindow(contact.id);
  return {
    found: true as const,
    open: open || isSimulatorContact(contact),
    lastInboundAt: lastInboundAt?.toISOString() ?? null,
    templateConfigured: await quoteTemplateConfigured(),
  };
}

export async function sendQuoteViaWhatsAppAction(quoteId: string) {
  try {
    await requireAuth();
    
    // PDF + envío por WhatsApp + instrucción interna para la IA (lógica compartida con la autorización por WhatsApp)
    const { contact, viaTemplate } = await sendQuotePdfToClient(quoteId);

    // Detonar la respuesta de la IA (con plantilla no: fuera de las 24 h su texto también rebotaría)
    if (contact.botMode && !viaTemplate) {
      // after() mantiene viva la función en Vercel hasta que el bot termine de contestar.
      after(async () => {
        try { await processAIAgentResponse(contact.id); } catch (err) { console.error("Error AI in WhatsApp Action:", err); }
      });
    }

    return { success: true, viaTemplate };
  } catch (error: any) {
    console.error("Error enviando cotización por WA:", error);
    return { success: false, error: error.message || "Error interno al enviar por WhatsApp" };
  }
}

export async function getQuickQuoteDataAction() {
  try {
    await requireAuth();
    const [materials, products, costConfigs, clients] = await Promise.all([
      prisma.material.findMany({
        where: { active: true },
        select: {
          id: true,
          name: true,
          length: true,
          width: true,
          sheetPrice: true,
          guardPercentage: true,
          pricePerCm2: true,
          brand: true,
          category: { select: { name: true } },
        },
        orderBy: { name: "asc" }
      }),
      prisma.product.findMany({
        where: { active: true },
        select: {
          id: true,
          sku: true,
          name: true,
          unitCost: true,
          unitPrice: true,
          provider: true,
          model: true,
          image: true,
          brand: true,
          color: true,
          stockQuantity: true,
          description: true,
          category: { select: { name: true } },
        },
        orderBy: { name: "asc" }
      }),
      prisma.costConfiguration.findMany(),
      prisma.client.findMany({
        where: { active: true },
        select: {
          id: true,
          name: true,
          phone: true,
          company: true,
        },
        orderBy: { name: "asc" }
      })
    ]);

    const globalCosts: Record<string, number> = {};
    costConfigs.forEach(c => {
      globalCosts[c.key] = c.value;
    });

    return {
      success: true,
      data: {
        materials,
        products,
        clients,
        globalCosts: buildGlobalCosts(globalCosts),
      }
    };
  } catch (error: any) {
    console.error("Error fetching quick quote data:", error);
    return { success: false, error: error.message || "Error al cargar datos del cotizador rápido" };
  }
}

