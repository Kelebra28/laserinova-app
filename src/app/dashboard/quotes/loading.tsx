import React from "react";
import { GlobalLoader } from "@/components/ui/GlobalLoader";

export default function QuotesLoading() {
  return (
    <GlobalLoader 
      label="Cargando Cotizaciones" 
      subLabel="Gestor de Presupuestos" 
      minHeight="min-h-[60vh]" 
    />
  );
}
