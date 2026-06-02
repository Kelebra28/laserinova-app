import React from "react";
import { GlobalLoader } from "@/components/ui/GlobalLoader";

export default function MaterialsLoading() {
  return (
    <GlobalLoader 
      label="Cargando Materiales" 
      subLabel="Catálogo y Lista de Precios" 
      minHeight="min-h-[60vh]" 
    />
  );
}
