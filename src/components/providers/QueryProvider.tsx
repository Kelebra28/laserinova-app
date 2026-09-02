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
            staleTime: 60 * 1000, // Los datos se consideran frescos por 1 minuto
            refetchOnWindowFocus: true, // Refresca si cambias de ventana y vuelves
            retry: 1, // Solo reintenta 1 vez si falla
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
