import { DashboardSkeleton } from "@/components/ui/Skeleton";

export default function QuoteDetailLoading() {
  return (
    <div className="space-y-6 max-w-7xl pb-10">
      {/* Premium Header Skeleton */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-pulse">
        <div className="flex items-center space-x-5">
          <div className="w-11 h-11 bg-gray-100 rounded-xl" />
          <div>
            <div className="flex items-center gap-3">
              <div className="w-32 h-8 bg-gray-100 rounded-lg" />
              <div className="w-20 h-5 bg-gray-100 rounded-full" />
              <div className="w-20 h-5 bg-gray-100 rounded-full" />
            </div>
            <div className="w-48 h-4 bg-gray-100 rounded-md mt-2" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-24 h-10 bg-gray-100 rounded-xl" />
          <div className="w-32 h-10 bg-gray-100 rounded-xl" />
          <div className="w-32 h-10 bg-gray-100 rounded-xl" />
        </div>
      </div>

      <div className="w-full h-10 bg-gray-100 rounded-xl animate-pulse" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Content Area Skeleton */}
        <div className="lg:col-span-8 space-y-6">
          {/* Bento Financial Summary Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm animate-pulse">
              <div className="w-20 h-3 bg-gray-100 rounded-full mb-3" />
              <div className="w-24 h-8 bg-gray-200 rounded-lg" />
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm animate-pulse">
              <div className="w-24 h-3 bg-gray-100 rounded-full mb-3" />
              <div className="w-24 h-8 bg-gray-200 rounded-lg" />
            </div>
            <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 shadow-sm animate-pulse">
              <div className="w-20 h-3 bg-emerald-100 rounded-full mb-3" />
              <div className="w-24 h-8 bg-emerald-200 rounded-lg" />
            </div>
          </div>

          {/* Concepts Table Skeleton */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
            <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/30">
              <div className="w-40 h-4 bg-gray-200 rounded-md" />
            </div>
            <div className="p-6 space-y-4">
              <div className="w-full h-12 bg-gray-50 rounded-lg" />
              <div className="w-full h-12 bg-gray-50 rounded-lg" />
              <div className="w-full h-12 bg-gray-50 rounded-lg" />
            </div>
          </div>
        </div>

        {/* Sidebar Area Skeleton */}
        <div className="lg:col-span-4 space-y-6">
          {/* Client Card Skeleton */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-pulse">
            <div className="w-32 h-4 bg-gray-200 rounded-md mb-6" />
            <div className="space-y-4">
              <div className="w-48 h-6 bg-gray-100 rounded-md" />
              <div className="w-full h-10 bg-gray-50 rounded-lg" />
              <div className="w-full h-10 bg-gray-50 rounded-lg" />
            </div>
          </div>

          {/* Work Status Skeleton */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-pulse">
            <div className="w-32 h-4 bg-gray-200 rounded-md mb-6" />
            <div className="grid grid-cols-2 gap-2">
              <div className="w-full h-12 bg-gray-50 rounded-lg" />
              <div className="w-full h-12 bg-gray-50 rounded-lg" />
              <div className="w-full h-12 bg-gray-50 rounded-lg" />
              <div className="w-full h-12 bg-gray-50 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
