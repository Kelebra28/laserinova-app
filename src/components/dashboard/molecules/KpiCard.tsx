import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import Sparkline from "../atoms/Sparkline";

type Props = {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: string;
  spark?: number[];
  sparkColor?: string;
  href?: string;
  children?: React.ReactNode;
};

/** Indicador: etiqueta, valor grande, detalle y tendencia opcional. Si lleva `href` es clicable. */
export default function KpiCard({ label, value, icon: Icon, tone, spark, sparkColor, href, children }: Props) {
  const body = (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-4 h-full flex flex-col ${href ? "hover:border-gray-300 hover:shadow transition-all" : ""}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{label}</p>
        <Icon className={`h-4 w-4 ${tone}`} />
      </div>
      <p className="text-2xl font-black text-gray-900 leading-none tabular-nums">{value}</p>
      <div className="mt-2 min-h-4">{children}</div>
      {spark && (
        <div className="mt-auto pt-2">
          <Sparkline data={spark} color={sparkColor} />
        </div>
      )}
    </div>
  );
  return href ? (
    <Link href={href} prefetch={false} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}

export function KpiCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 h-[148px] animate-pulse">
      <div className="h-3 w-20 bg-gray-100 rounded" />
      <div className="h-7 w-28 bg-gray-100 rounded mt-4" />
    </div>
  );
}
