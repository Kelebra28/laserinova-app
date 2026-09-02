"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getDashboardStatsService } from "../services/dashboard.service";

async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.id) {
    throw new Error("No autorizado");
  }
  return session!.user as any;
}

export async function getDashboardStats() {
  try {
    await requireAuth();
    const data = await getDashboardStatsService();
    return { success: true, data };
  } catch (error: any) {
    console.error("Error fetching dashboard stats:", error);
    return { success: false, error: error.message || "Error al obtener estadísticas del dashboard" };
  }
}
