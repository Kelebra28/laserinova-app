"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Select from "@/components/ui/Select";
import { GlobalLoader } from "@/components/ui/GlobalLoader";

interface QuotePaginationProps {
  totalPages: number;
  currentPage: number;
  totalItems: number;
  limit: number;
}

export default function QuotePagination({ totalPages, currentPage, totalItems, limit }: QuotePaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isPending, startTransition] = useTransition();

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  const handleLimitChange = (newLimit: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("limit", newLimit);
    params.set("page", "1"); // reset to page 1 on limit change
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  const limitOptions = [
    { value: "10", label: "10 por página" },
    { value: "20", label: "20 por página" },
    { value: "50", label: "50 por página" },
    { value: "100", label: "100 por página" },
  ];

  if (totalItems === 0) return null;

  return (
    <>
      {isPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm transition-all">
          <GlobalLoader label="Cargando página" subLabel="Espera un momento..." minHeight="min-h-0" />
        </div>
      )}
      <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/30 gap-4">
      <div className="flex items-center text-[10px] font-black text-gray-500 uppercase tracking-widest">
        Mostrando {(currentPage - 1) * limit + 1} a {Math.min(currentPage * limit, totalItems)} de {totalItems} resultados
      </div>
      
      <div className="flex items-center gap-4">
        <div className="w-40">
          <Select 
            options={limitOptions} 
            value={limit.toString()} 
            onChange={handleLimitChange}
            menuPlacement="top"
          />
        </div>

        <nav className="isolate inline-flex -space-x-px rounded-xl shadow-sm bg-white" aria-label="Pagination">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="relative inline-flex items-center rounded-l-xl px-2 py-2 text-gray-400 border border-gray-200 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span className="sr-only">Anterior</span>
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          
          <div className="relative inline-flex items-center px-4 py-2 text-xs font-bold text-gray-900 border-y border-gray-200">
            Página {currentPage} de {totalPages}
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="relative inline-flex items-center rounded-r-xl px-2 py-2 text-gray-400 border border-gray-200 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span className="sr-only">Siguiente</span>
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </nav>
      </div>
    </div>
    </>
  );
}
