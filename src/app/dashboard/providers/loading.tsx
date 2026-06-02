import React from "react";
import { GlobalLoader } from "@/components/ui/GlobalLoader";

export default function ProvidersLoading() {
  return (
    <GlobalLoader 
      label="Cargando Proveedores" 
      subLabel="Directorio de Contactos Comerciales" 
      minHeight="min-h-[60vh]" 
    />
  );
}
