"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import Select from "@/components/ui/Select";
import SearchInput from "@/components/ui/SearchInput";
import { GlobalLoader } from "@/components/ui/GlobalLoader";

interface Client {
  id: string;
  name: string;
  company: string | null;
}

interface QuoteFiltersProps {
  clients: Client[];
  defaultMonth: string;
}

export default function QuoteFilters({ clients, defaultMonth }: QuoteFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleParamChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      if (key === "month") {
        params.set(key, "all");
      } else {
        params.delete(key);
      }
    }
    
    // Always navigate to page 1 on filter changes
    params.set("page", "1");
    
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  // Generate last 12 months for the month selector
  const generateMonths = () => {
    const options = [{ value: "all", label: "Todos los meses" }];
    const date = new Date();
    // Start from current month
    for (let i = 0; i < 12; i++) {
      const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      // Capitalize first letter of label
      const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);
      options.push({ value, label: capitalizedLabel });
    }
    return options;
  };

  const monthOptions = generateMonths();

  const clientOptions = [
    { value: "all", label: "Todos los clientes" },
    ...clients.map(c => ({
      value: c.id,
      label: c.company ? `${c.name} (${c.company})` : c.name
    }))
  ];

  const statusOptions = [
    { value: "all", label: "Todos los estatus" },
    { value: "DRAFT", label: "Borrador" },
    { value: "CALCULATED", label: "Calculada" },
    { value: "SENT", label: "Enviada" },
    { value: "APPROVED", label: "Aprobada" },
    { value: "REJECTED", label: "Rechazada" },
    { value: "IN_PRODUCTION", label: "En Producción" },
    { value: "DELIVERED", label: "Entregada" },
    { value: "CANCELLED", label: "Cancelada" },
  ];

  const currentMonth = searchParams.get("month") ?? defaultMonth;
  const currentStatus = searchParams.get("status") || "all";
  const currentClient = searchParams.get("clientId") || "all";

  return (
    <>
      {isPending && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-white/50 backdrop-blur-sm transition-all">
          <GlobalLoader label="Actualizando tabla" subLabel="Espera un momento..." minHeight="min-h-0" />
        </div>
      )}
      <div className="flex flex-col lg:flex-row gap-4 w-full">
        <div className="flex-grow lg:max-w-md">
          <SearchInput 
            placeholder="Buscar por folio o proyecto..." 
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-grow">
          <Select
            options={monthOptions}
            value={currentMonth}
            onChange={(v) => handleParamChange("month", v)}
            placeholder="Mes"
            disabled={isPending}
          />
          <Select
            options={clientOptions}
            value={currentClient}
            onChange={(v) => handleParamChange("clientId", v)}
            placeholder="Cliente"
            disabled={isPending}
          />
          <Select
            options={statusOptions}
            value={currentStatus}
            onChange={(v) => handleParamChange("status", v)}
            placeholder="Estatus"
            disabled={isPending}
          />
        </div>
      </div>
    </>
  );
}
