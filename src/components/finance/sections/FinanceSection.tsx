import type { ReactNode } from "react";
import SectionTitle from "@/components/ui/atoms/SectionTitle";
import CountBadge from "@/components/ui/atoms/CountBadge";

type Props = { title: string; accent: string; count?: string; children: ReactNode };

/** Bloque de la pantalla: título con barra de color, conteo opcional y su contenido. */
export default function FinanceSection({ title, accent, count, children }: Props) {
  return (
    <section className="space-y-4">
      <SectionTitle accent={accent} action={count ? <CountBadge>{count}</CountBadge> : undefined}>
        {title}
      </SectionTitle>
      {children}
    </section>
  );
}
