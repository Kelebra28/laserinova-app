import { DashboardSkeleton } from "@/components/ui/Skeleton";
import { Loader2 } from "lucide-react";

export default function EditQuoteLoading() {
  return (
    <div className="space-y-6 max-w-7xl pb-10">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div className="w-64 h-8 bg-gray-200 rounded-lg animate-pulse" />
      </div>
      
      {/* Tabs Skeleton */}
      <div className="w-full h-12 bg-gray-100 rounded-xl mb-6 animate-pulse" />

      {/* Main Form Area Skeleton */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="h-10 w-10 text-red-600 animate-spin" />
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
            Cargando Editor de Cotización...
          </p>
        </div>

        {/* Dummy inputs to look like the form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 opacity-50">
          <div className="space-y-2">
            <div className="w-24 h-4 bg-gray-200 rounded animate-pulse" />
            <div className="w-full h-12 bg-gray-100 rounded-xl animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="w-32 h-4 bg-gray-200 rounded animate-pulse" />
            <div className="w-full h-12 bg-gray-100 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
