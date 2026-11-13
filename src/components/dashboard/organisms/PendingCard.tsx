"use client";

import Link from "next/link";
import { useState } from "react";
import Panel from "../atoms/Panel";
import FilterChip from "../atoms/FilterChip";
import ActionLink from "../atoms/ActionLink";
import { AllClear } from "../atoms/EmptyState";
import { PENDING_GROUPS, type PendingGroupKey } from "@/constants/dashboard.constants";
import { formatDuration } from "@/constants/formatters.constants";
import type { DashboardOverview } from "@/types/dashboard";

type Props = { pending: DashboardOverview["whatsapp"]["pending"] };

const LABEL = "text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1";

/** ¿De quién es la pelota? Te toca a ti (responder, cotizar) vs esperas al cliente. */
export default function PendingCard({ pending }: Props) {
  const { mine, theirs, groups } = pending;
  const [picked, setPicked] = useState<PendingGroupKey | null>(null);
  const activeKey = picked ?? PENDING_GROUPS.find((g) => groups[g.key].count > 0)?.key ?? "respond";
  const meta = PENDING_GROUPS.find((g) => g.key === activeKey)!;
  const { list, count } = groups[activeKey];

  const chips = (side: "mine" | "theirs") =>
    PENDING_GROUPS.filter((g) => g.side === side).map((g) => (
      <FilterChip key={g.key} active={g.key === activeKey} tone={side === "mine" ? "danger" : "info"} count={groups[g.key].count} onClick={() => setPicked(g.key)}>
        {g.label}
      </FilterChip>
    ));

  return (
    <Panel title="Pendientes" subtitle={`${mine} te tocan a ti · ${theirs} esperan al cliente`} className="h-full">
      <div className="space-y-2 mb-4">
        <div>
          <p className={LABEL}>Te toca a ti</p>
          <div className="flex flex-wrap gap-1.5">{chips("mine")}</div>
        </div>
        <div>
          <p className={LABEL}>Esperas al cliente</p>
          <div className="flex flex-wrap gap-1.5">{chips("theirs")}</div>
        </div>
      </div>
      <p className="text-xs text-gray-500 mb-2">{meta.hint}</p>
      {list.length === 0 ? (
        <AllClear title={meta.empty} />
      ) : (
        <ul className="space-y-0.5">
          {list.map((c) => {
            const hot = meta.side === "mine" && c.waitMin >= 60;
            const dot = meta.side === "theirs" ? "bg-gray-400" : hot ? "bg-red-500 animate-pulse" : "bg-amber-400";
            const time = meta.side === "theirs" ? "text-gray-500" : hot ? "text-red-600" : "text-amber-600";
            return (
              <li key={c.contactId}>
                <Link href={`/dashboard/chats?c=${c.contactId}`} prefetch={false} className="flex items-center gap-3 rounded-lg px-2 py-2 -mx-2 hover:bg-gray-50 transition-colors">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${dot}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                    <p className="text-xs text-gray-500 truncate">{c.detail}</p>
                  </div>
                  <span className={`text-xs font-bold tabular-nums shrink-0 ${time}`}>{formatDuration(c.waitMin)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {count > list.length && <p className="text-[11px] text-gray-400 mt-2">y {count - list.length} más…</p>}
      <ActionLink href="/dashboard/chats" tone="whatsapp" className="mt-auto pt-4">
        Abrir chats →
      </ActionLink>
    </Panel>
  );
}
