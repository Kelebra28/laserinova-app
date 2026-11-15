"use server";

import { z } from "zod";
import { requireAdminUser } from "@/lib/auth-guards";
import { PDF_MAX_FILE_BYTES, RECON_MAX_LINES, SUGGEST_MAX_COMBO } from "@/constants/reconciliation.constants";
import { extractPdfPages } from "@/lib/bank-pdf/extract";
import { parseStatementPages } from "@/lib/bank-pdf";
import { reconcileStatementService, registerBankPaymentService } from "../services/reconciliation.service";

const LineSchema = z.object({
  id: z.string().max(20),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().max(500),
  amount: z.number().finite(),
  balance: z.number().finite().nullable(),
});

const PeriodSchema = z.object({ from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

/** Solo ADMIN: Finanzas no es para vendedores ni solo lectura (las acciones se pueden invocar sin pasar por la página). */
async function requireUserId(): Promise<string> {
  return (await requireAdminUser()).id;
}

/**
 * Compara el estado de cuenta (ya leído en el navegador) contra los movimientos del sistema.
 * Solo lectura: el estado de cuenta no se guarda y no se cambia ningún dato.
 */
export async function reconcileBankStatement(lines: unknown, period?: unknown) {
  try {
    await requireUserId();
    const parsed = z.array(LineSchema).min(1).max(RECON_MAX_LINES).safeParse(lines);
    if (!parsed.success) throw new Error(`El estado de cuenta no es válido o trae más de ${RECON_MAX_LINES} renglones.`);
    const range = PeriodSchema.safeParse(period);
    return { success: true as const, data: await reconcileStatementService(parsed.data, undefined, range.success ? range.data : undefined) };
  } catch (error) {
    console.error("Error en la conciliación bancaria");
    return { success: false as const, error: error instanceof Error ? error.message : "No se pudo conciliar el estado de cuenta" };
  }
}

const RegisterSchema = z.object({
  line: LineSchema,
  fingerprint: z.string().regex(/^\d{4}-\d{2}-\d{2}\|-?\d+\.\d{2}\|[a-z0-9]+#\d+$/),
  allocations: z
    .array(z.object({ quoteId: z.string().min(1).max(64), amount: z.number().finite().positive() }))
    .min(1)
    .max(SUGGEST_MAX_COMBO + 2),
});

/**
 * Registra un depósito como cobro de una o varias cotizaciones. Se llama SOLO cuando la persona
 * confirma una sugerencia o un reparto manual. Todo o nada; no duplica si el depósito ya se registró.
 */
export async function registerBankPayment(input: unknown) {
  try {
    const userId = await requireUserId();
    const parsed = RegisterSchema.safeParse(input);
    if (!parsed.success) throw new Error("Los datos del cobro no son válidos.");
    const done = await registerBankPaymentService({ ...parsed.data, userId });
    return { success: true as const, data: done };
  } catch (error) {
    console.error("Error al registrar un cobro desde la conciliación");
    return { success: false as const, error: error instanceof Error ? error.message : "No se pudo registrar el cobro" };
  }
}

/**
 * Lee un estado de cuenta en PDF y devuelve sus movimientos junto con las comprobaciones contra los totales
 * que imprime el banco. Solo lectura: el archivo se procesa en memoria y no se guarda.
 */
export async function parseBankStatementPdf(formData: FormData) {
  try {
    await requireUserId();
    const file = formData.get("file");
    if (!(file instanceof File)) throw new Error("No llegó ningún archivo.");
    if (file.size > PDF_MAX_FILE_BYTES) throw new Error("El PDF es demasiado grande (máximo 4.5 MB). Sube un solo mes.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (String.fromCharCode(...bytes.slice(0, 5)) !== "%PDF-") throw new Error("El archivo no es un PDF válido.");

    let pages;
    try {
      pages = await extractPdfPages(bytes);
    } catch (error) {
      if (error instanceof Error && /páginas/.test(error.message)) throw error;
      throw new Error("No se pudo leer el PDF. Verifica que no esté protegido con contraseña ni sea una imagen escaneada.");
    }
    return { success: true as const, data: parseStatementPages(pages) };
  } catch (error) {
    console.error("Error al leer el estado de cuenta en PDF");
    return { success: false as const, error: error instanceof Error ? error.message : "No se pudo leer el PDF" };
  }
}
