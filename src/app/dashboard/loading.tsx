import React from "react";
import { GlobalLoader } from "@/components/ui/GlobalLoader";

export default function DashboardLoading() {
  return <GlobalLoader label="Cargando" subLabel="Laser Inova CRM" minHeight="min-h-[60vh]" />;
}

