/**
 * Tipos del dashboard. Los datos salen de los servicios del servidor; aquí se re-exportan
 * para que los componentes no importen código de servidor (solo tipos, se borran al compilar).
 */
import type { getDashboardStats } from "@/server/actions/dashboard.actions";

export type DashboardRange = "today" | "7d" | "30d" | "month";

export type { DashboardOverview } from "@/server/services/dashboard-overview.service";

/** Estadísticas del mes (flujo, embudo abierto, atención, tareas, rankings). */
export type DashboardStats = NonNullable<Awaited<ReturnType<typeof getDashboardStats>>["data"]>;
