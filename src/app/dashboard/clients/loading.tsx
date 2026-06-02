import React from "react";
import { GlobalLoader } from "@/components/ui/GlobalLoader";

export default function ClientsLoading() {
  return (
    <GlobalLoader 
      label="Cargando Clientes" 
      subLabel="Directorio de Clientes" 
      minHeight="min-h-[60vh]" 
    />
  );
}
