import React from "react";
import { GlobalLoader } from "@/components/ui/GlobalLoader";

export default function TasksLoading() {
  return (
    <GlobalLoader 
      label="Cargando Tareas" 
      subLabel="Gestor de Flujo de Trabajo (Kanban)" 
      minHeight="min-h-[60vh]" 
    />
  );
}
