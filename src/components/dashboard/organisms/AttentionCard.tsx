"use client";

import Link from "next/link";
import { useState } from "react";
import Panel from "../atoms/Panel";
import FilterChip from "../atoms/FilterChip";
import ActionLink from "../atoms/ActionLink";
import { AllClear } from "../atoms/EmptyState";
import { ATTENTION_META, ATTENTION_TONE_DOT } from "@/constants/dashboard.constants";
import type { DashboardStats } from "@/types/dashboard";

type Props = { groups: DashboardStats["attention"]; dormant: number };

/** Lo que se está quedando sin seguimiento, por tipo. Primero lo rescatable. */
export default function AttentionCard({ groups, dormant }: Props) {
  const [picked, setPicked] = useState<string | null>(null);
  const active = groups.find((g) => g.key === picked) ?? groups[0];
  const total = groups.reduce((s, g) => s + g.total, 0);
  const meta = active ? ATTENTION_META[active.key] : undefined;

  return (
    <Panel title="Requiere atención" subtitle={total === 0 ? "Lo que se está quedando sin seguimiento" : `${total} cosa${total === 1 ? "" : "s"} sin seguimiento`} className="h-full">
      {!active ? (
        <AllClear title="Todo al día" text="No hay pendientes vencidos ni cotizaciones estancadas." />
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {groups.map((g) => (
              <FilterChip key={g.key} active={g.key === active.key} count={g.total} onClick={() => setPicked(g.key)} leading={<span className={`h-2 w-2 rounded-full ${ATTENTION_TONE_DOT[g.tone]}`} />}>
                {ATTENTION_META[g.key]?.chip ?? g.label}
              </FilterChip>
            ))}
          </div>
          <p className="text-xs text-gray-500 mb-2">{meta?.hint}</p>
          <ul className="divide-y divide-gray-100">
            {active.items.map((it) => (
              <li key={it.id}>
                <Link href={it.href} prefetch={false} className="flex items-center gap-3 py-2.5 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${ATTENTION_TONE_DOT[active.tone]}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-gray-900 truncate">{it.title}</span>
                    <span className="block text-xs text-gray-500 truncate">{it.detail}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {active.total > active.items.length && (
            <ActionLink href={meta?.href ?? "/dashboard"} className="mt-2">
              y {active.total - active.items.length} más →
            </ActionLink>
          )}
          {active.key === "stale" && dormant > 0 && (
            <div className="mt-4 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
              Otras <b>{dormant}</b> cotizaciones llevan <b>más de 60 días</b> sin respuesta: probablemente ya se perdieron. Márcalas como perdidas para que no ensucien el embudo.
            </div>
          )}
        </>
      )}
    </Panel>
  );
}
