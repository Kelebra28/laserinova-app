"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/auth-guards";
import { PDF_MAX_FILE_BYTES } from "@/constants/reconciliation.constants";
import { MOVEMENTS_BATCH_MAX, STATEMENT_MAX_LINES } from "@/constants/bank-storage.constants";
import { extractPdfPages } from "@/lib/bank-pdf/extract";
import { parseStatementPages } from "@/lib/bank-pdf";
import { deleteStatementService, listStatementsService, registerExpensesService, saveStatementService, setIgnoredService } from "../services/bank-statement.service";

const IdsSchema = z.array(z.string().min(1).max(64)).min(1).max(MOVEMENTS_BATCH_MAX);
const fail = (label: string, error: unknown, fallback: string) => {
  console.error(label);
  return { success: false as const, error: error instanceof Error ? error.message : fallback };
};
const refresh = () => {
  revalidatePath("/dashboard/finance");
  revalidatePath("/dashboard/finance/panorama");
};

/** Los estados de cuenta guardados (datos, no PDFs). Solo ADMIN. */
export async function getStoredStatements() {
  try {
    await requireAdminUser();
    return { success: true as const, data: await listStatementsService() };
  } catch (error) {
    return fail("Error al leer los estados guardados", error, "No se pudieron leer los estados guardados");
  }
}

/**
 * Lee un PDF en el servidor y guarda lo que contiene (cuenta, periodo, saldos y movimientos); el archivo no se guarda.
 * Si ese mes de esa cuenta ya estaba guardado, no duplica nada.
 */
export async function uploadBankStatementPdf(formData: FormData) {
  try {
    const user = await requireAdminUser();
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
    const parsed = parseStatementPages(pages);
    if (parsed.lines.length === 0) throw new Error("No se encontraron movimientos en el PDF.");
    if (parsed.lines.length > STATEMENT_MAX_LINES) throw new Error(`El estado trae más de ${STATEMENT_MAX_LINES} movimientos.`);

    const saved = await saveStatementService(parsed, file.name.slice(0, 190), user.id);
    const [statement] = await listStatementsService(undefined, saved.id);
    refresh();
    return { success: true as const, data: { statement, status: saved.status } };
  } catch (error) {
    return fail("Error al leer y guardar el estado de cuenta", error, "No se pudo guardar el estado de cuenta");
  }
}

/** Quita un estado guardado. Los gastos ya registrados en Finanzas se conservan. */
export async function deleteBankStatement(id: unknown) {
  try {
    await requireAdminUser();
    await deleteStatementService(z.string().min(1).max(64).parse(id));
    refresh();
    return { success: true as const };
  } catch (error) {
    return fail("Error al quitar el estado de cuenta", error, "No se pudo quitar el estado");
  }
}

/** Registra cargos del banco como gastos en Finanzas. Solo los que la persona eligió. */
export async function registerBankExpenses(ids: unknown) {
  try {
    const user = await requireAdminUser();
    const data = await registerExpensesService(IdsSchema.parse(ids), user.id);
    refresh();
    return { success: true as const, data };
  } catch (error) {
    return fail("Error al registrar gastos desde el estado de cuenta", error, "No se pudieron registrar los gastos");
  }
}

/** Marca movimientos como "no es del negocio" (o los regresa a pendientes). */
export async function ignoreBankMovements(ids: unknown, ignored: unknown) {
  try {
    await requireAdminUser();
    const count = await setIgnoredService(IdsSchema.parse(ids), z.boolean().parse(ignored));
    refresh();
    return { success: true as const, data: { count } };
  } catch (error) {
    return fail("Error al marcar movimientos", error, "No se pudieron marcar los movimientos");
  }
}
