import React from "react";
import { GlobalLoader } from "@/components/ui/GlobalLoader";

export default function FinanceLoading() {
  return (
    <GlobalLoader 
      label="Cargando Finanzas" 
      subLabel="Control de Egresos e Ingresos" 
      minHeight="min-h-[60vh]" 
    />
  );
}
