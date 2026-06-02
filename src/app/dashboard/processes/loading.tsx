import React from "react";
import { GlobalLoader } from "@/components/ui/GlobalLoader";

export default function ProcessesLoading() {
  return (
    <GlobalLoader 
      label="Cargando Procesos" 
      subLabel="Parámetros de Maquinaria" 
      minHeight="min-h-[60vh]" 
    />
  );
}
