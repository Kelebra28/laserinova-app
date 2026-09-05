"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { 
  getPendingQuotesByClientService,
  getClientsForPaymentsService,
  createPaymentRequestService,
  getPaymentRequestsService,
  updatePaymentRequestStatusService,
  deletePaymentRequestService,
  updatePaymentRequestService
} from "../services/payment.service";

// Zod Schemas
const clientIdSchema = z.string().uuid("ID de cliente inválido");
const paymentRequestIdSchema = z.string().uuid("ID de solicitud inválido");

const createPaymentRequestSchema = z.object({
  amountRequested: z.number().positive("El monto debe ser positivo"),
  notes: z.string().optional(),
  quoteId: z.string().uuid("ID de cotización inválido"),
  clientId: z.string().uuid("ID de cliente inválido"),
});

const updatePaymentRequestStatusSchema = z.object({
  id: z.string().uuid("ID de solicitud inválido"),
  newStatus: z.enum(["PENDING", "PAID", "CANCELLED", "REJECTED"]),
});

const updatePaymentRequestSchema = z.object({
  id: z.string().uuid("ID de solicitud inválido"),
  data: z.object({
    amountRequested: z.number().positive("El monto debe ser positivo"),
    notes: z.string().default(""),
  })
});

// Helper for Session Validation (Zero Trust)
async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.id) {
    throw new Error("No autorizado");
  }
  return session!.user as any;
}

export async function getPendingQuotesByClient(clientId: string) {
  try {
    await requireAuth();
    const validId = clientIdSchema.parse(clientId);
    const quotes = await getPendingQuotesByClientService(validId);
    return { success: true, quotes };
  } catch (error: any) {
    console.error("Error fetching pending quotes:", error);
    return { success: false, error: error.message || "Error al obtener cotizaciones" };
  }
}

export async function getClientsForPayments() {
  try {
    await requireAuth();
    const clients = await getClientsForPaymentsService();
    return { success: true, data: clients };
  } catch (error: any) {
    console.error("Error fetching clients:", error);
    return { success: false, error: error.message || "Error al obtener clientes" };
  }
}

export async function createPaymentRequest(rawData: {
  amountRequested: number;
  notes?: string;
  quoteId: string;
  clientId: string;
}) {
  try {
    const user = await requireAuth();
    const data = createPaymentRequestSchema.parse(rawData);
    
    const pr = await createPaymentRequestService({
      ...data,
      createdById: user.id
    });

    revalidatePath("/dashboard/accounting/payments");
    revalidatePath("/dashboard/tasks");
    
    return { success: true, paymentRequest: pr };
  } catch (error: any) {
    console.error("Error creating payment request:", error);
    return { success: false, error: error.issues ? error.issues[0].message : error.message };
  }
}

export async function getPaymentRequests() {
  try {
    await requireAuth();
    const requests = await getPaymentRequestsService();
    return { success: true, data: requests };
  } catch (error: any) {
    console.error("Error fetching payment requests:", error);
    return { success: false, error: error.message || "Error al obtener solicitudes" };
  }
}

export async function updatePaymentRequestStatus(id: string, newStatus: string) {
  try {
    await requireAuth();
    const validData = updatePaymentRequestStatusSchema.parse({ id, newStatus });
    const pr = await updatePaymentRequestStatusService(validData.id, validData.newStatus);
    
    revalidatePath("/dashboard/payment-requests");
    return { success: true, data: pr };
  } catch (error: any) {
    return { success: false, error: error.issues ? error.issues[0].message : error.message };
  }
}

export async function deletePaymentRequest(id: string) {
  try {
    await requireAuth();
    const validId = paymentRequestIdSchema.parse(id);
    await deletePaymentRequestService(validId);
    
    revalidatePath("/dashboard/payment-requests");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.issues ? error.issues[0].message : error.message };
  }
}

export async function updatePaymentRequest(id: string, data: { amountRequested: number; notes: string }) {
  try {
    await requireAuth();
    const validData = updatePaymentRequestSchema.parse({ id, data });
    const pr = await updatePaymentRequestService(validData.id, validData.data);
    
    revalidatePath("/dashboard/payment-requests");
    return { success: true, data: pr };
  } catch (error: any) {
    return { success: false, error: error.issues ? error.issues[0].message : error.message };
  }
}
