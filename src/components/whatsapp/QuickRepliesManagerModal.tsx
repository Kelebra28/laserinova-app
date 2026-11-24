"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "react-hot-toast";
import { QUICK_REPLY_LIMITS, normalizeShortcut, type QuickReply, type QuickReplyInput } from "@/lib/quick-replies";

type Props = {
  open: boolean;
  items: QuickReply[];
  onClose: () => void;
  /** Cada acción devuelve el mensaje de error o null si salió bien. */
  onCreate: (input: QuickReplyInput) => Promise<string | null>;
  onUpdate: (id: string, input: QuickReplyInput) => Promise<string | null>;
  onRemove: (id: string) => Promise<string | null>;
};

const EMPTY: QuickReplyInput = { shortcut: "", title: "", content: "" };

/** Editor de respuestas rápidas: lista a la izquierda, formulario a la derecha (apilados en pantalla chica). */
export default function QuickRepliesManagerModal({ open, items, onClose, onCreate, onUpdate, onRemove }: Props) {
  // editingId: null = redactando una nueva; string = editando esa.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<QuickReplyInput>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!open || typeof document === "undefined") return null;

  const startNew = () => { setEditingId(null); setForm(EMPTY); };
  const startEdit = (r: QuickReply) => { setEditingId(r.id); setForm({ shortcut: r.shortcut, title: r.title, content: r.content }); };

  const save = async () => {
    setSaving(true);
    const error = editingId ? await onUpdate(editingId, form) : await onCreate(form);
    setSaving(false);
    if (error) { toast.error(error); return; }
    toast.success(editingId ? "Respuesta actualizada" : "Respuesta creada");
    startNew();
  };

  const remove = async (id: string) => {
    const error = await onRemove(id);
    setConfirmDeleteId(null);
    if (error) { toast.error(error); return; }
    if (editingId === id) startNew();
    toast.success("Respuesta eliminada");
  };

  const input = "w-full rounded-lg bg-[#2a3942] text-[#e9edef] placeholder-[#8696a0] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#00a884]/60";

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[88vh] flex flex-col rounded-2xl bg-[#111b21] border border-[#2a3942] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a3942]">
          <h2 className="text-base font-semibold text-[#e9edef]">Respuestas rápidas</h2>
          <button type="button" onClick={onClose} className="text-[#8696a0] hover:text-[#e9edef]" title="Cerrar"><X size={20} /></button>
        </div>

        <div className="flex-1 min-h-0 grid md:grid-cols-[1fr_1.2fr]">
          <div className="min-h-0 overflow-y-auto border-b md:border-b-0 md:border-r border-[#2a3942]">
            <button type="button" onClick={startNew} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-[#00a884] hover:bg-[#202c33] border-b border-[#2a3942]">
              <Plus size={16} /> Nueva respuesta
            </button>
            {items.length === 0 && <p className="px-4 py-4 text-sm text-[#8696a0]">Aún no hay respuestas rápidas.</p>}
            {items.map((r) => (
              <div key={r.id} className={`px-4 py-3 border-b border-[#202c33] ${editingId === r.id ? "bg-[#202c33]" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#e9edef]">/{r.shortcut}</p>
                    <p className="text-xs text-[#8696a0] truncate">{r.title}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => startEdit(r)} className="p-1.5 text-[#8696a0] hover:text-[#e9edef]" title="Editar"><Pencil size={15} /></button>
                    {confirmDeleteId === r.id ? (
                      <button type="button" onClick={() => remove(r.id)} className="px-2 py-1 text-xs rounded bg-red-600 text-white">¿Eliminar?</button>
                    ) : (
                      <button type="button" onClick={() => setConfirmDeleteId(r.id)} className="p-1.5 text-[#8696a0] hover:text-red-400" title="Eliminar"><Trash2 size={15} /></button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="min-h-0 overflow-y-auto p-4 space-y-3">
            <p className="text-sm text-[#8696a0]">{editingId ? "Editar respuesta" : "Nueva respuesta"}</p>
            <div>
              <label className="block text-xs text-[#8696a0] mb-1">Atajo (lo que escribes después de “/”)</label>
              <input
                className={input}
                value={form.shortcut}
                maxLength={QUICK_REPLY_LIMITS.shortcut}
                placeholder="direccion"
                onChange={(e) => setForm({ ...form, shortcut: e.target.value })}
                onBlur={() => setForm((f) => ({ ...f, shortcut: normalizeShortcut(f.shortcut) }))}
              />
            </div>
            <div>
              <label className="block text-xs text-[#8696a0] mb-1">Título</label>
              <input className={input} value={form.title} maxLength={QUICK_REPLY_LIMITS.title} placeholder="Dirección del taller" onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-[#8696a0] mb-1">Mensaje</label>
              <textarea className={`${input} min-h-[160px] resize-y`} value={form.content} maxLength={QUICK_REPLY_LIMITS.content} placeholder="Texto que se pondrá en la caja de mensaje" onChange={(e) => setForm({ ...form, content: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              {editingId && <button type="button" onClick={startNew} className="px-3 py-2 text-sm text-[#8696a0] hover:text-[#e9edef]">Cancelar edición</button>}
              <button type="button" onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00a884] hover:bg-[#00c298] text-[#06211b] text-sm font-medium disabled:opacity-60">
                {saving && <Loader2 size={14} className="animate-spin" />} {editingId ? "Guardar cambios" : "Crear respuesta"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
