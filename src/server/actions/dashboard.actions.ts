"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getDashboardStatsService } from "../services/dashboard.service";
import { getDashboardOverviewService, type DashboardRange } from "../services/dashboard-overview.service";

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

export async function getDashboardOverview(range: DashboardRange) {
  try {
    await requireAuth();
    const safe: DashboardRange = ["today", "7d", "30d", "month"].includes(range) ? range : "30d";
    const data = await getDashboardOverviewService(safe);
    return { success: true, data };
  } catch (error: any) {
    console.error("Error fetching dashboard overview:", error);
    return { success: false, error: error.message || "Error al obtener el resumen del dashboard" };
  }
}
