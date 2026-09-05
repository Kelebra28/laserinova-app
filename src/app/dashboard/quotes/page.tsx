import { Metadata } from "next";
import { Suspense } from "react";
import QuotesClient from "@/components/quotes/QuotesClient";
import { DashboardSkeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = {
  title: "Cotizaciones | CRM Laser Inova",
};

export default function QuotesPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <QuotesClient />
    </Suspense>
  );
}
