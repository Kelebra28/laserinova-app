import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Tamaños de badge que ya usa el CRM. */
const SIZES = {
  /** Tablas densas (reportes). */
  xs: "px-2 py-0.5 text-[8px] font-black uppercase rounded-md tracking-tighter shadow-sm border",
  /** Listas (cotizaciones). */
  sm: "px-2.5 py-1 inline-flex text-xs font-semibold rounded-full",
  /** Encabezados de detalle. */
  md: "px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border shadow-sm",
} as const;

export type BadgeSize = keyof typeof SIZES;

/** Átomo de etiqueta de estado. `tone` son las clases de color (fondo, texto y borde). */
export function Badge({ size = "sm", tone, className, children }: { size?: BadgeSize; tone: string; className?: string; children: ReactNode }) {
  return <span className={cn(SIZES[size], tone, className)}>{children}</span>;
}
