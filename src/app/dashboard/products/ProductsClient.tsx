"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Search, Loader2 } from "lucide-react";
import Link from "next/link";
import { getHexForColor } from "@/lib/constants";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Select from "@/components/ui/Select";

interface ProductsClientProps {
  initialProducts: any[];
  currentProvider: string;
  currentSearch: string;
  globalCategories: string[];
}

const PROVIDERS = ["Doble Vela", "Promoopcion", "Impressline"];
const ITEMS_PER_PAGE = 20;

export function ProductsClient({ initialProducts, currentProvider, currentSearch, globalCategories }: ProductsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState(currentSearch);
  
  // Categorias y Paginación
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Usar las categorías globales del proveedor (ordenadas por popularidad)
  const sortedCategories = globalCategories;
  const topCategories = sortedCategories.slice(0, 5);

  // Agrupar productos
  const allGroups = Object.values(
    initialProducts.reduce((acc, product) => {
      const model = product.model || product.id;
      if (!acc[model]) acc[model] = [];
      acc[model].push(product);
      return acc;
    }, {} as Record<string, any[]>)
  ) as any[][];

  // Filtrar grupos por categoría
  const filteredGroups = selectedCategory
    ? allGroups.filter(group => group[0].category?.name === selectedCategory)
    : allGroups;

  // Paginar
  const totalPages = Math.ceil(filteredGroups.length / ITEMS_PER_PAGE) || 1;
  const paginatedGroups = filteredGroups.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleProviderChange = (provider: string) => {
    startTransition(() => {
      const params = new URLSearchParams();
      params.set("provider", provider);
      if (searchTerm) params.set("q", searchTerm);
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    startTransition(() => {
      const params = new URLSearchParams();
      params.set("provider", currentProvider);
      if (searchTerm) params.set("q", searchTerm);
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <div className="space-y-8 relative">
      {/* Cabecera: Buscador y Tabs */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row gap-6 items-center justify-between bg-white p-2 pl-4 pr-2 rounded-2xl border border-zinc-200 shadow-sm">
          {/* Tabs / Providers */}
          <div className="flex items-center gap-1 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {PROVIDERS.map((provider) => (
              <button
                key={provider}
                onClick={() => handleProviderChange(provider)}
                className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 whitespace-nowrap ${
                  currentProvider === provider
                    ? "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-[0_4px_10px_rgba(220,38,38,0.3)]"
                    : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                }`}
              >
                {provider}
              </button>
            ))}
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="relative w-full lg:w-96 shrink-0 group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-zinc-400 group-focus-within:text-red-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Buscar por código, modelo o nombre..."
              className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-xl h-12 pl-12 pr-12 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all placeholder:text-zinc-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {isPending && (
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                <Loader2 className="w-5 h-5 animate-spin text-red-500" />
              </div>
            )}
          </form>
        </div>

        {/* Filtros Híbridos: Top 5 Píldoras + Dropdown */}
        {sortedCategories.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider mr-2 hidden sm:block">Familias:</span>
            
            <button
              onClick={() => { setSelectedCategory(null); setCurrentPage(1); }}
              className={`px-4 py-2 text-sm font-bold rounded-full transition-all border ${
                selectedCategory === null
                  ? "bg-zinc-900 text-white border-zinc-900 shadow-md"
                  : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50"
              }`}
            >
              Todas
            </button>
            
            {/* Top 5 Categorías más usadas */}
            {topCategories.map(cat => (
              <button
                key={cat}
                onClick={() => { setSelectedCategory(cat); setCurrentPage(1); }}
                className={`hidden md:block px-4 py-2 text-sm font-bold rounded-full transition-all border ${
                  selectedCategory === cat
                    ? "bg-zinc-900 text-white border-zinc-900 shadow-md"
                    : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50"
                }`}
              >
                {cat}
              </button>
            ))}

            {/* Dropdown Shadcn para TODAS las categorías */}
            <div className="shrink-0 ml-auto sm:ml-0 min-w-[200px] z-20">
              <Select 
                options={sortedCategories.map(cat => ({ value: cat, label: cat }))}
                value={selectedCategory || ""}
                onChange={(val) => { setSelectedCategory(val); setCurrentPage(1); }}
                placeholder="+ Más Familias..."
              />
            </div>
          </div>
        )}
      </div>

        {/* Grid de Productos */}
        {paginatedGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 px-4 border border-dashed border-zinc-300 rounded-3xl bg-zinc-50/50">
            <div className="w-24 h-24 mb-6 rounded-full bg-zinc-100 flex items-center justify-center border border-zinc-200 shadow-sm">
              <Search className="w-10 h-10 text-zinc-400" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 mb-2">Catálogo vacío</h3>
            <p className="text-zinc-500 max-w-md text-center">
              No encontramos productos. Intenta cambiar tu búsqueda o filtros.
            </p>
          </div>
        ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {paginatedGroups.map((group) => {
              const mainProduct = group[0];
              const totalStock = group.reduce((sum, p) => sum + p.stockQuantity, 0);

              return (
                <Link 
                  href={`/dashboard/products/${mainProduct.id}`} 
                  key={mainProduct.model || mainProduct.id}
                  className="group flex flex-col bg-white border border-zinc-200 rounded-2xl overflow-hidden hover:border-red-500/50 hover:shadow-lg transition-all duration-500"
                >
                  <div className="aspect-[4/3] bg-white relative overflow-hidden flex items-center justify-center p-6 border-b border-zinc-100">
                    {mainProduct.image ? (
                      <img 
                        src={mainProduct.image} 
                        alt={mainProduct.name} 
                        onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/400x300?text=Imagen+No+Disponible" }}
                        className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700 ease-out"
                      />
                    ) : (
                      <div className="text-zinc-300 font-medium">Sin Imagen</div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    {/* Etiqueta de Stock Total */}
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm border border-zinc-200 shadow-sm px-2 py-1 rounded-md text-[10px] font-bold text-zinc-700 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {totalStock} en stock
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <span className="inline-block px-2 py-1 rounded-md bg-red-50 text-red-600 text-[10px] font-bold tracking-wider uppercase border border-red-100">
                        {mainProduct.model}
                      </span>
                      <h3 className="text-sm font-semibold text-zinc-800 line-clamp-2 leading-snug group-hover:text-red-600 transition-colors" title={mainProduct.name}>
                        {mainProduct.name.split(' ').filter((w: string) => !group.some(p => p.color?.includes(w))).join(' ')} 
                      </h3>
                    </div>
                    <div className="flex items-end justify-between pt-4 mt-4 border-t border-zinc-100">
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mb-1">Costo Base</p>
                        <p className="text-lg font-black text-zinc-900">
                          ${mainProduct.unitCost.toFixed(2)}
                        </p>
                      </div>
                      {group.length > 1 ? (
                        <div className="flex flex-col items-end">
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Variantes</p>
                          <div className="flex -space-x-1.5">
                            {group.slice(0, 4).map((p, i) => (
                              <div 
                                key={i} 
                                className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                                style={{ background: getHexForColor(p.color) }}
                                title={p.color || "Color"}
                              />
                            ))}
                            {group.length > 4 && (
                              <div className="w-5 h-5 rounded-full border-2 border-white bg-zinc-100 flex items-center justify-center shadow-sm text-[8px] font-bold text-zinc-600">
                                +{group.length - 4}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        mainProduct.color && (
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Color Único</p>
                            <div className="flex items-center gap-1 justify-end">
                              <div className="w-3 h-3 rounded-full border border-zinc-200" style={{ background: getHexForColor(mainProduct.color) }}></div>
                              <p className="text-xs text-zinc-700 font-medium truncate max-w-[80px]">{mainProduct.color.replace(/^\d+\s*-\s*/, '')}</p>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          
          {/* Controles de Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-8">
              <button
                disabled={currentPage === 1}
                onClick={() => {
                  setCurrentPage(prev => Math.max(1, prev - 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="p-2 bg-white border border-zinc-200 rounded-full text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-sm font-medium text-zinc-500">
                Página <span className="text-zinc-900">{currentPage}</span> de <span className="text-zinc-900">{totalPages}</span>
              </div>
              <button
                disabled={currentPage === totalPages}
                onClick={() => {
                  setCurrentPage(prev => Math.min(totalPages, prev + 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="p-2 bg-white border border-zinc-200 rounded-full text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
