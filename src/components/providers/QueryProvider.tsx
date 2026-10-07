"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, ReactNode } from "react";

interface QueryProviderProps {
  children: ReactNode;
}

export default function QueryProvider({ children }: QueryProviderProps) {
  // Inicializamos el cliente aquí para asegurarnos de que no se comparta
  // entre diferentes usuarios u requests durante el SSR
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000 * 5, // Aumentado a 5 minutos para relajar a Hostinger
            refetchOnWindowFocus: false, // CRÍTICO: Evita spam de requests al cambiar de pestaña
            retry: false, // CRÍTICO: Cero reintentos. Si falla, falla 1 vez y ya, para no ser baneado por Hostinger
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
