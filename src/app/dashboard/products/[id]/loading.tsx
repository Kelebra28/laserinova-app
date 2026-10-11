import { ArrowLeft, Loader2 } from "lucide-react";

export default function ProductDetailLoading() {
  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-zinc-200 rounded-full" />
        <div className="space-y-2">
          <div className="w-48 h-8 bg-zinc-200 rounded-lg" />
          <div className="w-64 h-4 bg-zinc-100 rounded" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Columna Izquierda: Galería Skeleton */}
        <div className="space-y-4">
          <div className="aspect-[4/3] bg-zinc-100 rounded-3xl border border-zinc-200 flex flex-col items-center justify-center p-8 relative overflow-hidden">
            <Loader2 className="w-10 h-10 text-zinc-300 animate-spin mb-3" />
            <div className="w-32 h-4 bg-zinc-200 rounded" />
          </div>
          <div className="grid grid-cols-5 gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="aspect-square bg-zinc-100 rounded-xl border border-zinc-200" />
            ))}
          </div>
        </div>

        {/* Columna Derecha: Métricas y Ficha Técnica Skeleton */}
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="w-24 h-5 bg-zinc-200 rounded-md" />
            <div className="w-3/4 h-10 bg-zinc-200 rounded-xl" />
          </div>

          {/* Tarjetas de Métricas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-zinc-200 bg-white rounded-2xl p-6 space-y-3">
              <div className="w-24 h-4 bg-zinc-200 rounded" />
              <div className="w-32 h-8 bg-zinc-200 rounded" />
              <div className="w-20 h-4 bg-zinc-100 rounded" />
            </div>
            <div className="border border-zinc-200 bg-white rounded-2xl p-6 space-y-3">
              <div className="w-24 h-4 bg-zinc-200 rounded" />
              <div className="w-28 h-8 bg-zinc-200 rounded" />
              <div className="w-16 h-4 bg-zinc-100 rounded" />
            </div>
          </div>

          {/* Variantes Selector Skeleton */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4">
            <div className="w-36 h-4 bg-zinc-200 rounded" />
            <div className="flex gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 bg-zinc-200 rounded-full" />
                  <div className="w-12 h-3 bg-zinc-100 rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* Ficha Técnica Skeleton */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4">
            <div className="w-32 h-6 bg-zinc-200 rounded" />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="w-16 h-3 bg-zinc-200 rounded" />
                <div className="w-24 h-4 bg-zinc-100 rounded" />
              </div>
              <div className="space-y-2">
                <div className="w-16 h-3 bg-zinc-200 rounded" />
                <div className="w-24 h-4 bg-zinc-100 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
