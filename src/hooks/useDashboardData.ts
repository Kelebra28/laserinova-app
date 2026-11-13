"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getDashboardOverview, getDashboardStats } from "@/server/actions/dashboard.actions";
import { DASHBOARD_DEFAULT_RANGE, DASHBOARD_REFRESH_MS } from "@/constants/dashboard.constants";
import type { DashboardRange } from "@/types/dashboard";

/**
 * Datos del dashboard: estadísticas del mes (una vez) y resumen del periodo elegido
 * (se refresca solo para que los pendientes y los mensajes del día estén al corriente).
 */
export function useDashboardData() {
  const [range, setRange] = useState<DashboardRange>(DASHBOARD_DEFAULT_RANGE);

  const stats = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: async () => {
      const res = await getDashboardStats();
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
  });

  const overview = useQuery({
    queryKey: ["dashboardOverview", range],
    queryFn: async () => {
      const res = await getDashboardOverview(range);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    placeholderData: keepPreviousData,
    refetchInterval: DASHBOARD_REFRESH_MS,
  });

  return { range, setRange, stats, overview };
}
