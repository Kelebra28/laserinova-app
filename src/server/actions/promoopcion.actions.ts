"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  getPromoOpcionToken,
  syncPromoOpcionCatalogService,
} from "../services/promoopcion.service";

// Zod validation schemas
const syncCatalogSchema = z.object({
  page: z.number().int().min(1).default(1),
});

/**
 * Helper de autenticación Zero-Trust & RBAC
 */
async function requireAuth(allowedRoles?: string[]) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user?.id) {
    throw new Error("No autorizado: Debes iniciar sesión.");
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw new Error("Acceso denegado: Privilegios insuficientes para gestionar catálogos.");
  }
  return user;
}

/**
 * Valida la conexión y estado del token de Promo Opción sin descargar productos masivos
 */
export async function testPromoOpcionConnectionAction() {
  try {
    await requireAuth(["ADMIN", "SUPERADMIN"]);
    const token = await getPromoOpcionToken();
    return {
      success: true,
      message: "Conexión exitosa con la API de Promo Opción. Token activo y verificado.",
      hasToken: Boolean(token),
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Error al conectar con Promo Opción.",
    };
  }
}

/**
 * Sincroniza una página del catálogo de Promo Opción e impacta en Prisma
 */
export async function syncPromoOpcionCatalogAction(input?: { page?: number }) {
  try {
    await requireAuth(["ADMIN", "SUPERADMIN"]);
    const validated = syncCatalogSchema.parse(input || { page: 1 });

    const result = await syncPromoOpcionCatalogService(validated.page);

    revalidatePath("/dashboard/products");

    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Error al sincronizar el catálogo de Promo Opción.",
    };
  }
}

/**
 * Server Action para sincronizar únicamente el stock de los productos de Promo Opción en la BD
 */
export async function syncPromoOpcionStockAction() {
  try {
    await requireAuth(["ADMIN", "SUPERADMIN"]);
    const { syncPromoOpcionStockOnlyService } = await import("../services/promoopcion.service");
    const result = await syncPromoOpcionStockOnlyService();

    revalidatePath("/dashboard/products");

    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Error al actualizar las existencias de Promo Opción.",
    };
  }
}

