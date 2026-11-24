"use client";

import { Settings2, Zap } from "lucide-react";
import type { QuickReply } from "@/lib/quick-replies";

type Props = {
  items: QuickReply[];
  /** Total guardado (para distinguir "no hay ninguna" de "ninguna coincide"). */
  total: number;
  onPick: (reply: QuickReply) => void;
  onManage: () => void;
};

/** Lista emergente sobre la caja de mensaje. Solo muestra y avisa; no sabe de dónde vienen los datos. */
export default function QuickReplyPicker({ items, total, onPick, onManage }: Props) {
  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 z-20 mx-2 rounded-xl border border-[#2a3942] bg-[#202c33] shadow-xl overflow-hidden">
      <div className="max-h-64 overflow-y-auto">
        {items.length === 0 ? (
          <p className="px-4 py-3 text-sm text-[#8696a0]">
            {total === 0 ? "Aún no hay respuestas rápidas." : "Ninguna coincide con lo que escribes."}
          </p>
        ) : (
          items.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onPick(r)}
              className="w-full text-left px-4 py-2.5 hover:bg-[#2a3942] border-b border-[#2a3942] last:border-b-0"
            >
              <div className="flex items-center gap-2">
                <Zap size={13} className="text-[#00a884] shrink-0" />
                <span className="text-sm font-medium text-[#e9edef]">/{r.shortcut}</span>
                <span className="text-xs text-[#8696a0] truncate">{r.title}</span>
              </div>
              <p className="mt-0.5 text-xs text-[#8696a0] line-clamp-2 whitespace-pre-line">{r.content}</p>
            </button>
          ))
        )}
      </div>
      <button
        type="button"
        onClick={onManage}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs text-[#8696a0] hover:text-[#e9edef] bg-[#1a252c] hover:bg-[#2a3942]"
      >
        <Settings2 size={14} /> Administrar respuestas rápidas
      </button>
    </div>
  );
}
