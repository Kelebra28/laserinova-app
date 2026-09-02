"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { 
  getQuotesListService, 
  getActiveQuotesKanbanService, 
  getClientsForFiltersService,
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
  updateQuotePaymentKanbanService
} from "../services/quote.service";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.id) {
    throw new Error("No autorizado");
  }
  return session!.user as any;
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

export async function approveQuoteVersion(groupId: string, approvedQuoteId: string) {
  await requireAuth();
  if (!groupId || !approvedQuoteId) throw new Error("Datos incompletos");

  await approveQuoteVersionService(groupId, approvedQuoteId);
  revalidatePath(`/dashboard/quotes`);
  revalidatePath(`/dashboard/finance`);
  revalidatePath(`/dashboard/quotes/${approvedQuoteId}`);
}

export async function createQuoteAction(formData: FormData) {
  const user = await requireAuth();
  const data = {
    clientId: formData.get("clientId") as string,
    prospectName: (formData.get("prospectName") as string) || null,
    project: formData.get("project") as string,
    description: formData.get("description") as string,
    imagesStr: formData.get("images") as string,
    images: formData.get("images") ? JSON.parse(formData.get("images") as string) : [],
    subtotal: parseFloat(formData.get("subtotal") as string) || 0,
    tax: parseFloat((formData.get("tax") as string) || (formData.get("iva") as string)) || 0,
    total: parseFloat(formData.get("total") as string) || 0,
    taxable: formData.get("taxable") !== "false",
    realCostTotal: parseFloat(formData.get("realCostTotal") as string) || 0,
    estimatedUtility: parseFloat(formData.get("estimatedUtility") as string) || 0,
    conceptsDataStr: formData.get("conceptsData") as string,
    conceptsData: JSON.parse(formData.get("conceptsData") as string || "[]"),
    globalCostsSnapshotStr: formData.get("globalCostsSnapshot") as string,
    saveAsClient: formData.get("saveAsClient") === "true",
    visibleConsiderations: formData.get("visibleConsiderations") as string,
  };
  if (!data.project || !data.conceptsDataStr) throw new Error("Faltan datos requeridos (Proyecto y Conceptos)");

  const quoteId = await createQuoteService(user.id, data);
  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/quotes/${quoteId}`);
}

export async function updateQuoteAction(formData: FormData) {
  const quoteId = formData.get("quoteId") as string;
  const user = await requireAuth();
  const data = {
    clientId: formData.get("clientId") as string || null,
    prospectName: (formData.get("prospectName") as string) || null,
    saveAsClient: formData.get("saveAsClient") === "true",
    project: formData.get("project") as string,
    description: formData.get("description") as string,
    imagesStr: formData.get("images") as string,
    images: formData.get("images") ? JSON.parse(formData.get("images") as string) : [],
    subtotal: parseFloat(formData.get("subtotal") as string),
    tax: parseFloat(formData.get("tax") as string),
    total: parseFloat(formData.get("total") as string),
    realCostTotal: parseFloat(formData.get("realCostTotal") as string),
    estimatedUtility: parseFloat(formData.get("estimatedUtility") as string),
    taxable: formData.get("taxable") === "true",
    conceptsData: JSON.parse(formData.get("concepts") as string || "[]"),
  };

  await updateQuoteDataService(user.id, quoteId, data);
  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/quotes/${quoteId}`);
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
