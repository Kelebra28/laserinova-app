import React, { HTMLAttributes } from "react";

export function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800 ${className}`}
      {...props}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-1/4 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
      <Skeleton className="h-96 w-full rounded-2xl" />
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-500 w-full">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60">
        <Skeleton className="h-10 w-1/3 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 space-y-4">
        <div className="flex justify-between items-center">
           <Skeleton className="h-8 w-64 rounded-lg" />
           <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
        <div className="space-y-3 pt-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
