"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Plus, FileText, LayoutGrid, List, Zap, ChevronDown, ChevronUp, ChevronsUpDown, X, MoreHorizontal } from "lucide-react";
import { QuickQuoteModal } from "@/components/quotes/QuickQuoteModal";
import QuoteRow from "@/components/quotes/QuoteRow";
import QuoteFilters from "@/components/quotes/QuoteFilters";
import QuotePagination from "@/components/quotes/QuotePagination";
import KanbanBoard from "@/components/dashboard/KanbanBoard";
import {
  getQuotesList,
  getQuotesSummary,
  getActiveQuotesKanban,
  getClientsForFilters,
  deleteQuoteAction,
} from "@/server/actions/quote.actions";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import { DashboardSkeleton } from "@/components/ui/Skeleton";

const columns = [
  { id: "SENT", label: "Enviada", colorClass: "bg-blue-500", dotClass: "bg-blue-500", shadowClass: "shadow-[0_0_8px_rgba(59,130,246,0.5)]" },
  { id: "APPROVED", label: "Aprobada", colorClass: "bg-purple-500", dotClass: "bg-purple-500", shadowClass: "shadow-[0_0_8px_rgba(168,85,247,0.5)]" },
  { id: "IN_PRODUCTION", label: "En Proceso", colorClass: "bg-orange-500", dotClass: "bg-orange-500", shadowClass: "shadow-[0_0_8px_rgba(249,115,22,0.5)]" },
  { id: "DELIVERED", label: "Entregada", colorClass: "bg-emerald-500", dotClass: "bg-emerald-500", shadowClass: "shadow-[0_0_8px_rgba(16,185,129,0.5)]" },
  { id: "CALCULATED", label: "Calculada", colorClass: "bg-cyan-500", dotClass: "bg-cyan-500", shadowClass: "shadow-[0_0_8px_rgba(6,182,212,0.5)]" },
  { id: "DRAFT", label: "Borrador", colorClass: "bg-gray-500", dotClass: "bg-gray-500", shadowClass: "shadow-[0_0_8px_rgba(107,114,128,0.5)]" },
  { id: "CANCELLED", label: "Cancelada / Rechazada", colorClass: "bg-red-500", dotClass: "bg-red-500", shadowClass: "shadow-[0_0_8px_rgba(239,68,68,0.5)]" },
];

const money = (n: number) => `$${n.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;

function SortableTh({
  k, sort, dir, onToggle, children, align = "left",
}: { k: string; sort: string; dir: string; onToggle: (k: string) => void; children: React.ReactNode; align?: "left" | "right" }) {
  const Icon = sort !== k ? ChevronsUpDown : dir === "asc" ? ChevronUp : ChevronDown;
  return (
    <th scope="col" aria-sort={sort === k ? (dir === "asc" ? "ascending" : "descending") : "none"} className={`px-4 py-3 ${align === "right" ? "text-right" : "text-left"}`}>
      <button type="button" onClick={() => onToggle(k)} className={`inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900 ${align === "right" ? "flex-row-reverse" : ""}`}>
        {children}
        <Icon className={`h-3 w-3 ${sort === k ? "text-red-600" : "text-gray-300"}`} />
      </button>
    </th>
  );
}

type QuickKey = "open" | "unpaid" | "stale" | "draft";

export default function QuotesClient() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const month = searchParams.get("month") || "all";
  const clientId = searchParams.get("clientId") || "all";
  const status = searchParams.get("status") || "all";
  const quick = searchParams.get("quick") || "";
  const sort = searchParams.get("sort") || "createdAt";
  const dir = searchParams.get("dir") === "asc" ? "asc" : "desc";
  const view = searchParams.get("view") === "board" ? "board" : "list";
  const urlPage = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const itemsPerPage = Math.max(1, parseInt(searchParams.get("limit") || "10", 10) || 10);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isQuickQuoteOpen, setIsQuickQuoteOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Debounce: la búsqueda se manda al servidor 350 ms después de dejar de teclear
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  /** Actualiza varios parámetros de la URL a la vez (valor vacío = quitar). */
  const setParams = useCallback(
    (updates: Record<string, string | null>, opts: { resetPage?: boolean } = {}) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === "") params.delete(k);
        else params.set(k, v);
      }
      if (opts.resetPage) params.set("page", "1");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (urlPage !== 1) setParams({ page: "1" });
  };

  const hasActiveFilters =
    month !== "all" || clientId !== "all" || status !== "all" || quick !== "" || searchTerm !== "";

  const clearFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setParams({ month: null, clientId: null, status: null, quick: null, page: "1" });
  };

  // Lista: paginada, filtrada y ordenada en el servidor; conserva la página anterior mientras carga
  const { data: listData, isLoading: isLoadingList, isFetching: isFetchingList, error: listError } = useQuery({
    queryKey: ["quotesList", month, clientId, status, quick, sort, dir, debouncedSearch, urlPage, itemsPerPage],
    queryFn: async () => {
      const res = await getQuotesList({
        search: debouncedSearch,
        month,
        clientId,
        status,
        quick,
        sort,
        dir,
        page: String(urlPage),
        limit: String(itemsPerPage),
      });
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    placeholderData: keepPreviousData,
    staleTime: 5000,
  });

  const { data: summary } = useQuery({
    queryKey: ["quotesSummary"],
    queryFn: async () => {
      const res = await getQuotesSummary();
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    staleTime: 5000,
  });

  // El tablero solo se consulta cuando se está viendo
  const { data: kanbanData, isLoading: isLoadingKanban, error: kanbanError } = useQuery({
    queryKey: ["quotesKanban"],
    queryFn: async () => {
      const res = await getActiveQuotesKanban();
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    enabled: view === "board",
    staleTime: 5000,
  });

  const { data: clientsData } = useQuery({
    queryKey: ["clientsFilter"],
    queryFn: async () => {
      const res = await getClientsForFilters();
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    staleTime: 60000,
  });

  const { quotes: displayedQuotes = [], defaultMonth = "all", totalItems = 0, totalPages = 1 } = listData || {};

  // Si la página pedida quedó fuera de rango (p. ej. se borró el último elemento), regresar a la última
  useEffect(() => {
    if (listData && urlPage > listData.totalPages) setParams({ page: String(listData.totalPages) });
  }, [listData, urlPage, setParams]);

  useEffect(() => {
    if (listError) toast.error(`Error cargando lista: ${(listError as Error).message}`);
    if (kanbanError) toast.error(`Error cargando tablero: ${(kanbanError as Error).message}`);
  }, [listError, kanbanError]);

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["quotesList"] });
    queryClient.invalidateQueries({ queryKey: ["quotesKanban"] });
    queryClient.invalidateQueries({ queryKey: ["quotesSummary"] });
    queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
  };

  const handleConfirmDelete = async () => {
    if (!quoteToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteQuoteAction(quoteToDelete.id);
      if (res.success) {
        toast.success(`Cotización ${quoteToDelete.folio} eliminada`);
        setQuoteToDelete(null);
        refreshAll();
      } else {
        toast.error(res.error || "Error al eliminar cotización");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar cotización");
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSort = (key: string) => {
    if (sort === key) setParams({ dir: dir === "asc" ? "desc" : "asc" }, { resetPage: true });
    else setParams({ sort: key, dir: key === "folio" ? "asc" : "desc" }, { resetPage: true });
  };

  if (isLoadingList) return <DashboardSkeleton />;

  const currentPage = Math.min(urlPage, totalPages);

  const summaryCards: { key: QuickKey; label: string; value: string; hint: string; tone: string }[] = [
    { key: "open", label: "En proceso", value: money(summary?.open.amount ?? 0), hint: `${summary?.open.count ?? 0} cotizaciones activas`, tone: "text-gray-900" },
    { key: "unpaid", label: "Por cobrar", value: money(summary?.unpaid.amount ?? 0), hint: `${summary?.unpaid.count ?? 0} con saldo`, tone: "text-amber-600" },
    { key: "stale", label: "Sin respuesta (+7 d)", value: String(summary?.stale.count ?? 0), hint: summary?.stale.count ? `${money(summary.stale.amount)} en espera` : "Todo al día", tone: summary?.stale.count ? "text-red-600" : "text-emerald-600" },
    { key: "draft", label: "Borradores", value: String(summary?.drafts.count ?? 0), hint: "Sin enviar", tone: "text-gray-900" },
  ];

  const sortProps = { sort, dir, onToggle: toggleSort };
  const plainTh = "px-4 py-3 text-left text-xs font-semibold text-gray-500";

  return (
    <div className="space-y-5">
      {/* Encabezado: una acción principal, el resto en un menú */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Cotizaciones</h1>
          <p className="text-sm text-gray-500 mt-0.5">Presupuestos y seguimiento de proyectos</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMenuOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              aria-label="Más formas de cotizar"
              className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)} />
                <div role="menu" className="absolute right-0 mt-2 w-56 z-20 rounded-xl border border-gray-100 bg-white shadow-lg p-1">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { setIsMenuOpen(false); setIsQuickQuoteOpen(true); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    <Zap className="h-4 w-4 text-amber-500" /> Cotizador rápido
                  </button>
                  <Link
                    role="menuitem"
                    href="/dashboard/quotes/quick"
                    prefetch={false}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    <FileText className="h-4 w-4 text-gray-400" /> Cotización libre
                  </Link>
                </div>
              </>
            )}
          </div>
          <Link
            href="/dashboard/quotes/new"
            prefetch={false}
            className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition-colors active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Nueva cotización
          </Link>
        </div>
      </div>

      {/* Resumen: cada tarjeta también es un filtro */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {summaryCards.map((c) => {
          const active = quick === c.key;
          return (
            <button
              key={c.key}
              type="button"
              aria-pressed={active}
              onClick={() => setParams({ quick: active ? null : c.key, view: "list" }, { resetPage: true })}
              className={`text-left rounded-2xl border p-4 transition-colors bg-white ${active ? "border-red-500 ring-2 ring-red-500/15" : "border-gray-100 hover:border-gray-200"}`}
            >
              <p className="text-xs font-semibold text-gray-500">{c.label}</p>
              <p className={`text-2xl font-black mt-1 tabular-nums ${c.tone}`}>{c.value}</p>
              <p className="text-xs text-gray-400 mt-1">{c.hint}</p>
            </button>
          );
        })}
      </div>

      {/* Barra de vista + filtros */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div role="tablist" aria-label="Vista" className="inline-flex rounded-xl bg-gray-100 p-1">
            {([["list", "Lista", List], ["board", "Tablero", LayoutGrid]] as const).map(([k, label, Icon]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={view === k}
                onClick={() => setParams({ view: k === "list" ? null : k })}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${view === k ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
          {hasActiveFilters && view === "list" && (
            <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 text-sm font-semibold text-red-600 hover:text-red-700">
              <X className="h-4 w-4" /> Limpiar filtros
            </button>
          )}
        </div>

        {view === "list" && (
          <QuoteFilters clients={clientsData || []} defaultMonth={defaultMonth} searchTerm={searchTerm} onSearchChange={handleSearchChange} />
        )}
      </div>

      {view === "board" ? (
        <div className="-mx-4 px-4 pb-4 overflow-x-auto hide-scrollbar">
          {isLoadingKanban && <div className="h-64 rounded-2xl bg-gray-100 animate-pulse" />}
          {kanbanData && <KanbanBoard initialQuotes={kanbanData} columns={columns} onChanged={refreshAll} />}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className={`overflow-x-auto min-h-[360px] rounded-t-2xl transition-opacity ${isFetchingList ? "opacity-60" : ""}`}>
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50/60 border-b border-gray-100">
                  <SortableTh k="folio" {...sortProps}>Folio</SortableTh>
                  <th scope="col" className={plainTh}>Cliente</th>
                  <th scope="col" className={plainTh}>Proyecto</th>
                  <SortableTh k="total" align="right" {...sortProps}>Total</SortableTh>
                  <th scope="col" className={plainTh}>Estatus</th>
                  <th scope="col" className={plainTh}>Pago</th>
                  <SortableTh k="createdAt" {...sortProps}>Fecha</SortableTh>
                  <th scope="col" className={plainTh}>Creó</th>
                  <th scope="col" className="px-4 py-3"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayedQuotes.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-16 text-center">
                      <FileText className="h-8 w-8 text-gray-200 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-gray-600">
                        {hasActiveFilters ? "Ninguna cotización coincide con los filtros" : "Aún no hay cotizaciones"}
                      </p>
                      {hasActiveFilters && (
                        <button type="button" onClick={clearFilters} className="mt-2 text-sm font-semibold text-red-600 hover:text-red-700">
                          Limpiar filtros
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  displayedQuotes.map((quote: any) => (
                    <QuoteRow key={quote.id} quote={quote} onDeleteRequest={setQuoteToDelete} />
                  ))
                )}
              </tbody>
            </table>
          </div>

          <QuotePagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} limit={itemsPerPage} />
        </div>
      )}

      <ConfirmationModal
        isOpen={!!quoteToDelete}
        onClose={() => setQuoteToDelete(null)}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        title="Eliminar Cotización"
        message={`¿Estás seguro de que deseas eliminar permanentemente la cotización ${quoteToDelete?.folio} (${quoteToDelete?.project || "Sin proyecto"})? Esta acción no se puede deshacer.`}
        confirmText="Sí, Eliminar"
        cancelText="Cancelar"
        variant="danger"
      />
      <QuickQuoteModal isOpen={isQuickQuoteOpen} onClose={() => setIsQuickQuoteOpen(false)} />
    </div>
  );
}
