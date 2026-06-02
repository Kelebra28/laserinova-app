import React from "react";
import { GlobalLoader } from "@/components/ui/GlobalLoader";

export default function InventoryLoading() {
  return (
    <GlobalLoader 
      label="Cargando Inventario" 
      subLabel="Control de Stock de Productos" 
      minHeight="min-h-[60vh]" 
    />
  );
}
