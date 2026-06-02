import React from "react";
import { GlobalLoader } from "@/components/ui/GlobalLoader";

export default function SettingsLoading() {
  return (
    <GlobalLoader 
      label="Cargando Configuración" 
      subLabel="Parámetros Globales y del Sistema" 
      minHeight="min-h-[60vh]" 
    />
  );
}
