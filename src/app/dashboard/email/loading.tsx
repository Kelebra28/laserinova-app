import React from "react";
import { GlobalLoader } from "@/components/ui/GlobalLoader";

export default function EmailLoading() {
  return (
    <GlobalLoader 
      label="Cargando Correo" 
      subLabel="Bandeja de Entrada" 
      minHeight="min-h-[60vh]" 
    />
  );
}
