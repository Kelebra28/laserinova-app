"use client";

import { useState, useRef } from "react";
import {
  X, CalendarDays, Flag, Users, Check, Zap, AlertTriangle, UserCheck, Plus, Trash2, CheckSquare
} from "lucide-react";
import { createTaskTag, type TaskPriority, type TaskStatus } from "@/app/dashboard/tasks/actions";
import { UserAvatar } from "@/components/ui/UserAvatar";

interface TaskUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface TaskTag {
  id: string;
  name: string;
  color: string;
}

interface SubTask {
  id: string;
  title: string;
  done: boolean;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  points: number;
  progress: number;
  blockerReason: string | null;
  dueDate: string | null;
  assignees: { user: TaskUser }[];
  subtasks: SubTask[];
  tags: TaskTag[];
}

interface Props {
  task: Task | null;
  users: TaskUser[];
  tags: TaskTag[];
  currentUserRole: string;
  initialStatus?: TaskStatus;
  onClose: () => void;
  onSave: (data: {
    title: string;
    description?: string;
    priority: TaskPriority;
    points: number;
    progress: number;
    blockerReason?: string;
    dueDate?: string;
    assigneeIds: string[];
    subtasks: { id: string; title: string }[];
    tagIds: string[];
  }) => void;
}

// ─── Priority config ──────────────────────────────────────────────────────────

const PRIORITY_OPTIONS: {
  value: TaskPriority;
  label: string;
  icon: string;
  activeBg: string;
  activeText: string;
  ring: string;
}[] = [
  { value: "HIGH",   label: "Alta",   icon: "🔴", activeBg: "bg-red-600   border-red-600",    activeText: "text-white", ring: "ring-red-400/30"    },
  { value: "NORMAL", label: "Normal", icon: "🟡", activeBg: "bg-amber-500 border-amber-500",  activeText: "text-white", ring: "ring-amber-400/30"  },
  { value: "LOW",    label: "Baja",   icon: "🔵", activeBg: "bg-slate-700 border-slate-700",  activeText: "text-white", ring: "ring-slate-400/30"  },
];

function getProgressColor(p: number) {
  if (p >= 80) return "from-emerald-400 to-emerald-600";
  if (p >= 40) return "from-blue-400 to-indigo-500";
  return "from-amber-400 to-orange-500";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TaskModal({ task, initialStatus, users, tags, currentUserRole, onClose, onSave }: Props) {
  const [title, setTitle]           = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [priority, setPriority]     = useState<TaskPriority>(task?.priority ?? "NORMAL");
  const [points, setPoints]         = useState(task?.points ?? 0);
  const [progress, setProgress]     = useState(task?.progress ?? 0);
  const [blockerReason, setBlockerReason] = useState(task?.blockerReason ?? "");
  const [dueDate, setDueDate]       = useState(task?.dueDate ? task.dueDate.slice(0, 10) : "");
  const [assigneeIds, setAssigneeIds] = useState<string[]>(task?.assignees.map((a) => a.user.id) ?? []);
  const [tagIds, setTagIds] = useState<string[]>(task?.tags?.map((t) => t.id) ?? []);
  
  const [localSubtasks, setLocalSubtasks] = useState<{ id: string; title: string }[]>(
    task?.subtasks.map((s) => ({ id: s.id, title: s.title })) ?? []
  );
  const [subTitle, setSubTitle] = useState("");
  const subInputRef = useRef<HTMLInputElement>(null);

  const [newTagName, setNewTagName] = useState("");
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  const titleRef = useRef<HTMLDivElement>(null);
  const tagsRef = useRef<HTMLDivElement>(null);
  const assigneeRef = useRef<HTMLDivElement>(null);

  const [saving, setSaving]         = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);

  const isBlocked = task?.status === "BLOCKED" || initialStatus === "BLOCKED";
  const showProgress = task?.status === "IN_PROGRESS" || task?.status === "BLOCKED";
  const noAssignee = assigneeIds.length === 0;
  const noTags = tagIds.length === 0;

  const toggleAssignee = (userId: string) =>
    setAssigneeIds((prev) => prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]);

  const handleAddSubtask = () => {
    if (!subTitle.trim()) return;
    setLocalSubtasks((prev) => [...prev, { id: `tmp-${Date.now()}`, title: subTitle.trim() }]);
    setSubTitle("");
    subInputRef.current?.focus();
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    setIsCreatingTag(true);
    try {
      const newTag = await createTaskTag(newTagName.trim());
      // Append tagId to current selection so it's auto-selected
      setTagIds(prev => [...prev, newTag.id]);
      setNewTagName("");
    } catch (e) {
      console.error(e);
    } finally {
      setIsCreatingTag(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTriedSubmit(true);

    if (!title.trim()) {
      titleRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (noTags) {
      tagsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (noAssignee) {
      assigneeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSaving(true);
    await onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      points,
      progress,
      blockerReason: isBlocked ? (blockerReason.trim() || undefined) : undefined,
      dueDate: dueDate || undefined,
      assigneeIds,
      subtasks: localSubtasks,
      tagIds,
    });
    setSaving(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        style={{ animation: "modalIn 0.2s cubic-bezier(0.34,1.56,0.64,1) both" }}
      >
        <div className="h-1 w-full bg-gradient-to-r from-red-500 via-rose-500 to-orange-400 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-black text-gray-900 tracking-tight">
              {task ? "Editar tarea" : "Nueva tarea"}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {task ? "Modifica los detalles de la tarea" : "Completa los campos para crear la tarea"}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1 min-h-0">

            {/* Title */}
            <div ref={titleRef}>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Título *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="¿Qué hay que hacer?"
                required
                autoFocus
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm font-medium text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all bg-gray-50/50"
              />
            </div>

            {/* Tags */}
            <div ref={tagsRef}>
              <label className="block text-[11px] font-black uppercase tracking-widest mb-2 flex items-center gap-1"
                style={{ color: triedSubmit && noTags ? "#ef4444" : "#9ca3af" }}>
                Categorías *
              </label>
              {triedSubmit && noTags && (
                <p className="text-xs text-red-500 mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Debes seleccionar al menos una categoría
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const selected = tagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => setTagIds(prev => selected ? prev.filter(id => id !== tag.id) : [...prev, tag.id])}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all border ${
                        selected
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm ring-2 ring-indigo-500/20"
                          : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-700"
                      }`}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Crear nueva categoría..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateTag();
                    }
                  }}
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <button
                  type="button"
                  disabled={isCreatingTag || !newTagName.trim()}
                  onClick={handleCreateTag}
                  className="px-3 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-xl disabled:opacity-50"
                >
                  {isCreatingTag ? "..." : "+"}
                </button>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Descripción</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalles, contexto o instrucciones..."
                rows={3}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all resize-none bg-gray-50/50"
              />
            </div>

            {/* Subtasks */}
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                <CheckSquare className="w-3 h-3" /> Checklist de Subtareas
              </label>
              <div className="space-y-2 mb-2">
                {localSubtasks.map((st) => (
                  <div key={st.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl">
                    <CheckSquare className="w-4 h-4 text-gray-300" />
                    <span className="flex-1 text-sm text-gray-700">{st.title}</span>
                    <button
                      type="button"
                      onClick={() => setLocalSubtasks((prev) => prev.filter((item) => item.id !== st.id))}
                      className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white">
                <Plus className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  ref={subInputRef}
                  type="text"
                  value={subTitle}
                  onChange={(e) => setSubTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSubtask();
                    }
                  }}
                  placeholder="Agregar una subtarea..."
                  className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
                />
                {subTitle.trim() && (
                  <button
                    type="button"
                    onClick={handleAddSubtask}
                    className="text-[10px] font-black text-blue-600 hover:text-blue-700 shrink-0"
                  >
                    AGREGAR
                  </button>
                )}
              </div>
            </div>

            {/* Blocker reason — only shown when editing a BLOCKED task */}
            {isBlocked && (
              <div>
                <label className="block text-[11px] font-black text-rose-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Razón del bloqueo *
                </label>
                <textarea
                  value={blockerReason}
                  onChange={(e) => setBlockerReason(e.target.value)}
                  placeholder="¿Cuál es el inconveniente o qué se necesita para continuar?"
                  rows={2}
                  required
                  className="w-full px-4 py-3 rounded-2xl border-2 border-rose-200 text-sm text-gray-700 placeholder-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 transition-all resize-none bg-rose-50/30"
                />
              </div>
            )}

            {/* Priority — sorted HIGH → NORMAL → LOW */}
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">
                <Flag className="w-3 h-3 inline mr-1 mb-0.5" /> Prioridad
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PRIORITY_OPTIONS.map((opt) => {
                  const active = priority === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPriority(opt.value)}
                      className={`relative flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-2xl border-2 font-bold text-xs transition-all duration-200
                        ${active ? `${opt.activeBg} ${opt.activeText} shadow-lg ring-4 ${opt.ring} scale-[1.03]` : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-100"}`}
                    >
                      <span className="text-lg leading-none">{opt.icon}</span>
                      <span className={active ? "text-white/90" : ""}>{opt.label}</span>
                      {active && (
                        <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-white/25 rounded-full flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Progress — unified bar */}
            {showProgress && (
              <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 inline-block" /> Avance
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative h-4 bg-gray-100 rounded-full">
                    <div
                      className={`absolute top-0 left-0 h-full rounded-full bg-gradient-to-r ${getProgressColor(progress)} pointer-events-none transition-all duration-300`}
                      style={{ width: `${progress}%` }}
                    />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={progress}
                      onChange={(e) => setProgress(parseInt(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                  </div>
                  <span className="text-sm font-black text-gray-700 w-10 text-right shrink-0">{progress}%</span>
                </div>
              </div>
            )}

            {/* Story points */}
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                <Zap className="w-3 h-3 text-violet-500" /> Puntos (1 punto = 1 hora)
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPoints((p) => Math.max(0, p - 1))}
                  className="w-10 h-10 rounded-xl border-2 border-gray-200 text-gray-600 font-black text-lg hover:border-gray-300 hover:bg-gray-50 transition-all flex items-center justify-center"
                >
                  −
                </button>
                <div className="flex-1 relative">
                  <input
                    type="number"
                    min={0}
                    max={999}
                    value={points}
                    onChange={(e) => setPoints(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-4 py-3 text-center rounded-2xl border border-gray-200 text-lg font-black text-violet-700 bg-violet-50/50 focus:outline-none focus:ring-2 focus:ring-violet-400/20 focus:border-violet-400 transition-all"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-violet-400">
                    {points === 1 ? "hora" : "horas"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPoints((p) => p + 1)}
                  className="w-10 h-10 rounded-xl border-2 border-violet-200 text-violet-600 font-black text-lg hover:border-violet-400 hover:bg-violet-50 transition-all flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>

            {/* Due date */}
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">
                <CalendarDays className="w-3 h-3 inline mr-1 mb-0.5" /> Fecha límite
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm text-gray-700 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all cursor-pointer"
              />
            </div>

            {/* Assignees — REQUIRED */}
            <div ref={assigneeRef}>
              <label className="block text-[11px] font-black uppercase tracking-widest mb-1 flex items-center gap-1"
                style={{ color: triedSubmit && noAssignee ? "#ef4444" : "#9ca3af" }}>
                <UserCheck className="w-3 h-3" />
                Responsable *
              </label>
              {triedSubmit && noAssignee && (
                <p className="text-xs text-red-500 mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Debes asignar al menos un responsable
                </p>
              )}
              {users.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No hay usuarios disponibles.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {users.map((user) => {
                    const selected = assigneeIds.includes(user.id);
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => toggleAssignee(user.id)}
                        className={`group flex items-center gap-2 p-2 rounded-2xl border-2 transition-all duration-200 text-left
                          ${selected
                            ? "border-red-500 bg-red-50/60 shadow-sm"
                            : triedSubmit && noAssignee
                            ? "border-red-200 bg-gray-50/60"
                            : "border-gray-100 bg-gray-50/60 hover:border-gray-200"
                          }`}
                      >
                        <UserAvatar name={user.name} size="base" className="group-hover:scale-110 transition-transform" />
                        <div className="flex-1 min-w-0">
                          <p className={`text-[11px] font-bold truncate leading-tight ${selected ? "text-red-700" : "text-gray-800"}`}>{user.name.split(" ")[0]}</p>
                          <p className="text-[9px] text-gray-400 truncate">{user.role === "ADMIN" ? "Admin" : "Vendedor"}</p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${selected ? "border-red-600 bg-red-600" : "border-gray-300"}`}>
                          {selected && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex gap-3 bg-gray-50/50 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-2xl border-2 border-gray-200 text-sm font-bold text-gray-600 hover:bg-white transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="flex-1 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-sm font-black shadow-lg shadow-red-600/25 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Guardando...
                </span>
              ) : task ? "Guardar cambios" : "Crear tarea"}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.9) translateY(12px); }
          to   { opacity: 1; transform: scale(1)   translateY(0);    }
        }
      `}</style>
    </div>
  );
}
