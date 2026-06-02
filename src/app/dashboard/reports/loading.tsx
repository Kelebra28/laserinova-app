import React from "react";
import { GlobalLoader } from "@/components/ui/GlobalLoader";

export default function ReportsLoading() {
  return (
    <GlobalLoader 
      label="Cargando Reportes" 
      subLabel="Análisis de Rendimiento" 
      minHeight="min-h-[60vh]" 
    />
  );
}
