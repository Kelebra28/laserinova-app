import React from "react";
import { GlobalLoader } from "@/components/ui/GlobalLoader";

export default function LabelsLoading() {
  return (
    <GlobalLoader 
      label="Cargando Etiquetas" 
      subLabel="Impresión de Identificadores" 
      minHeight="min-h-[60vh]" 
    />
  );
}
