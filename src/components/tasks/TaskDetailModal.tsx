"use client";

import { useState, useTransition, useRef } from "react";
import {
  X, Flag, CalendarDays, Clock, User, Pencil, AlertTriangle,
  CheckCircle2, Loader2, Timer, Users, AlignLeft, Zap,
  Plus, Trash2, Square, CheckSquare,
} from "lucide-react";
import {
  updateTaskStatusAction,
  updateTaskProgressAction,
  createSubTaskAction,
  toggleSubTaskAction,
  deleteSubTaskAction,
  type TaskStatus,
  type TaskPriority,
} from "@/app/dashboard/tasks/actions";
import { UserAvatar } from "@/components/ui/UserAvatar";

// ─── Types ───────────────────────────────────────────────────────────────────

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
  order: number;
  createdAt: string;
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
  order: number;
  createdById: string | null;
  createdBy: { id: string; name: string } | null;
  assignees: { user: TaskUser }[];
  subtasks: SubTask[];
  tags: TaskTag[];
  createdAt: string;
  updatedAt: string;
}

interface Props {
  task: Task;
  currentUserRole: string;
  currentUserId: string;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus, blockerReason?: string) => void;
  onProgressChange: (taskId: string, progress: number) => void;
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_META: Record<TaskStatus, {
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
}> = {
  BACKLOG:     { label: "Por Hacer",  icon: AlignLeft,     color: "text-slate-600",   bg: "bg-slate-100",   border: "border-slate-200" },
  PENDING:     { label: "Pendiente",  icon: Clock,         color: "text-amber-600",   bg: "bg-amber-50",    border: "border-amber-200" },
  IN_PROGRESS: { label: "En Proceso", icon: Loader2,       color: "text-blue-600",    bg: "bg-blue-50",     border: "border-blue-200"  },
  BLOCKED:     { label: "Bloqueado",  icon: AlertTriangle, color: "text-rose-600",    bg: "bg-rose-50",     border: "border-rose-200"  },
  DONE:        { label: "Terminado",  icon: CheckCircle2,  color: "text-emerald-600", bg: "bg-emerald-50",  border: "border-emerald-200" },
};

const PRIORITY_META: Record<TaskPriority, { label: string; color: string; dot: string }> = {
  LOW:    { label: "Baja",   color: "text-slate-500",  dot: "bg-slate-400"  },
  NORMAL: { label: "Normal", color: "text-amber-600",  dot: "bg-amber-400"  },
  HIGH:   { label: "Alta",   color: "text-red-600",    dot: "bg-red-500"    },
};

const ALL_STATUSES: TaskStatus[] = ["BACKLOG", "PENDING", "IN_PROGRESS", "BLOCKED", "DONE"];

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function isOverdue(iso: string | null, status: TaskStatus) {
  if (!iso || status === "DONE") return false;
  return new Date(iso) < new Date();
}

function getProgressColor(p: number) {
  if (p >= 80) return "from-emerald-400 to-emerald-600";
  if (p >= 40) return "from-blue-400 to-indigo-500";
  return "from-amber-400 to-orange-500";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TaskDetailModal({
  task,
  currentUserRole,
  currentUserId,
  onClose,
  onEdit,
  onStatusChange,
  onProgressChange,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [showBlockerInput, setShowBlockerInput] = useState(false);
  const [blockerReason, setBlockerReason] = useState("");
  const [pendingStatus, setPendingStatus] = useState<TaskStatus | null>(null);

  // Local progress state
  const [localProgress, setLocalProgress] = useState(
    task.status === "DONE" ? 100 : task.progress
  );
  const progressTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Subtasks local state
  const [subtasks, setSubtasks] = useState<SubTask[]>(task.subtasks ?? []);
  const [newSubTitle, setNewSubTitle] = useState("");
  const [addingSubtask, setAddingSubtask] = useState(false);
  const subInputRef = useRef<HTMLInputElement>(null);

  const canModify = currentUserRole === "ADMIN" || task.createdBy?.id === currentUserId;
  const sm = STATUS_META[task.status];
  const pm = PRIORITY_META[task.priority] || PRIORITY_META["NORMAL"];
  const overdue = isOverdue(task.dueDate, task.status);

  const showProgressBar = task.status === "IN_PROGRESS" || task.status === "BLOCKED";
  const displayProgress = task.status === "DONE" ? 100 : localProgress;

  // ── Status ──────────────────────────────────────────────────────────────────

  const handleStatusClick = (status: TaskStatus) => {
    if (status === task.status) return;
    if (status === "BLOCKED") {
      setPendingStatus(status);
      setShowBlockerInput(true);
      return;
    }
    startTransition(async () => {
      await updateTaskStatusAction(task.id, status);
      onStatusChange(task.id, status);
    });
  };

  const handleBlockerConfirm = () => {
    if (!blockerReason.trim() || !pendingStatus) return;
    startTransition(async () => {
      await updateTaskStatusAction(task.id, "BLOCKED", blockerReason.trim());
      onStatusChange(task.id, "BLOCKED", blockerReason.trim());
      setShowBlockerInput(false);
      setBlockerReason("");
      setPendingStatus(null);
    });
  };

  // ── Progress ─────────────────────────────────────────────────────────────────

  const handleProgressChange = (val: number) => {
    setLocalProgress(val);
    onProgressChange(task.id, val); // Optimistic local state update
    if (progressTimeout.current) clearTimeout(progressTimeout.current);
    progressTimeout.current = setTimeout(() => {
      startTransition(async () => {
        await updateTaskProgressAction(task.id, val);
      });
    }, 600);
  };

  // ── Subtasks ─────────────────────────────────────────────────────────────────

  const handleAddSubtask = async () => {
    if (!newSubTitle.trim()) return;
    const tempId = `tmp-${Date.now()}`;
    const temp: SubTask = { id: tempId, title: newSubTitle.trim(), done: false, order: subtasks.length, createdAt: new Date().toISOString() };
    setSubtasks((prev) => [...prev, temp]);
    setNewSubTitle("");
    const created = await createSubTaskAction(task.id, newSubTitle.trim());
    setSubtasks((prev) => prev.map((s) => (s.id === tempId ? { ...created } : s)));
  };

  const handleToggleSubtask = async (subId: string, done: boolean) => {
    setSubtasks((prev) => prev.map((s) => (s.id === subId ? { ...s, done } : s)));
    await toggleSubTaskAction(subId, done);
  };

  const handleDeleteSubtask = async (subId: string) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== subId));
    if (!subId.startsWith("tmp-")) await deleteSubTaskAction(subId);
  };

  const doneCount = subtasks.filter((s) => s.done).length;
  const subProgress = subtasks.length > 0 ? Math.round((doneCount / subtasks.length) * 100) : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
        style={{ animation: "modalIn 0.2s cubic-bezier(0.34,1.56,0.64,1) both" }}
      >
        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-red-500 via-rose-500 to-orange-400" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black border ${sm.bg} ${sm.border} ${sm.color}`}>
                <sm.icon className="w-3 h-3" />
                {sm.label}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-bold ${pm.color}`}>
                <span className={`w-2 h-2 rounded-full ${pm.dot}`} />
                {pm.label}
              </span>
              {task.points > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold text-violet-700 bg-violet-50 border border-violet-200">
                  <Zap className="w-3 h-3" />
                  {task.points}h
                </span>
              )}
            </div>
            <h2 className="text-xl font-black text-gray-900 leading-tight">{task.title}</h2>
            {task.tags && task.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {task.tags.map(tag => (
                  <span key={tag.id} className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 border border-gray-200 text-[10px] font-black uppercase tracking-widest">
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {canModify && (
              <button
                onClick={() => onEdit(task)}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                title="Editar tarea"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto space-y-5">

          {/* ── Blocker reason banner ───────────────────────────────── */}
          {task.status === "BLOCKED" && task.blockerReason && (
            <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl">
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black text-rose-700 uppercase tracking-widest mb-1">Bloqueador</p>
                <p className="text-sm text-rose-700 leading-relaxed">{task.blockerReason}</p>
              </div>
            </div>
          )}

          {/* ── Blocker input (when switching to BLOCKED) ─────── */}
          {showBlockerInput && (
            <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl space-y-3">
              <p className="text-xs font-black text-rose-700 uppercase tracking-widest flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> ¿Cuál es el bloqueador? *
              </p>
              <textarea
                value={blockerReason}
                onChange={(e) => setBlockerReason(e.target.value)}
                placeholder="Describe el inconveniente o lo que se necesita para continuar..."
                rows={3}
                autoFocus
                className="w-full px-4 py-3 rounded-xl border border-rose-200 text-sm text-gray-800 placeholder-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 resize-none bg-white"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowBlockerInput(false); setBlockerReason(""); setPendingStatus(null); }}
                  className="px-4 py-2 text-xs font-bold text-gray-600 border-2 border-gray-200 rounded-xl hover:bg-white transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleBlockerConfirm}
                  disabled={!blockerReason.trim() || isPending}
                  className="px-4 py-2 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 rounded-xl disabled:opacity-50 transition-all"
                >
                  {isPending ? "Guardando..." : "Confirmar bloqueador"}
                </button>
              </div>
            </div>
          )}

          {/* ── Progress bar ─────────────────────────────────────────── */}
          {(showProgressBar || task.status === "DONE") && (
            <div className="bg-gray-50 rounded-2xl border border-gray-100 px-4 py-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                  <Timer className="w-3 h-3" /> Avance
                </p>
                <span className="text-sm font-black text-gray-700">{displayProgress}%</span>
              </div>
              <div className="relative h-4 bg-gray-200 rounded-full">
                <div
                  className={`absolute top-0 left-0 h-full rounded-full bg-gradient-to-r ${getProgressColor(displayProgress)} pointer-events-none transition-all duration-300`}
                  style={{ width: `${displayProgress}%` }}
                />
                {showProgressBar && canModify && (
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={localProgress}
                    onChange={(e) => handleProgressChange(parseInt(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                )}
              </div>
              {showProgressBar && canModify && (
                <div className="flex justify-between text-[10px] text-gray-400 font-bold mt-2 px-1">
                  <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
                </div>
              )}
              {task.status === "DONE" && (
                <p className="text-[10px] text-emerald-600 font-black mt-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Tarea completada
                </p>
              )}
            </div>
          )}

          {/* ── Quick status change ──────────────────────────────────── */}
          <div>
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2.5">
              Cambiar estado
            </p>
            <div className="flex flex-wrap gap-2">
              {ALL_STATUSES.map((s) => {
                const meta = STATUS_META[s];
                const isActive = task.status === s;
                return (
                  <button
                    key={s}
                    onClick={() => handleStatusClick(s)}
                    disabled={isPending}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all duration-150
                      ${isActive
                        ? `${meta.bg} ${meta.border} ${meta.color} shadow-sm ring-2 ring-offset-1 ring-current/20`
                        : "bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600"
                      }`}
                  >
                    <meta.icon className="w-3.5 h-3.5" />
                    {meta.label}
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Description ─────────────────────────────────────────── */}
          {task.description && (
            <div>
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2.5 flex items-center gap-1">
                <AlignLeft className="w-3 h-3" /> Descripción
              </p>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-2xl px-4 py-3 border border-gray-100">
                {task.description}
              </p>
            </div>
          )}

          {/* ── Subtasks / Checklist ─────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <CheckSquare className="w-3 h-3" /> Subtareas
                {subtasks.length > 0 && (
                  <span className="ml-1.5 text-[10px] font-black px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                    {doneCount}/{subtasks.length}
                  </span>
                )}
              </p>
              {canModify && (
                <button
                  type="button"
                  onClick={() => { setAddingSubtask(true); setTimeout(() => subInputRef.current?.focus(), 50); }}
                  className="flex items-center gap-1 text-[10px] font-black text-red-600 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-all"
                >
                  <Plus className="w-3 h-3" /> Agregar
                </button>
              )}
            </div>

            {/* Mini progress for subtasks */}
            {subtasks.length > 0 && (
              <div className="mb-2 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-500"
                    style={{ width: `${subProgress}%` }}
                  />
                </div>
                <span className="text-[10px] font-black text-gray-400 shrink-0">{subProgress}%</span>
              </div>
            )}

            <div className="space-y-1.5">
              {subtasks.map((sub) => (
                <div
                  key={sub.id}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all ${
                    sub.done ? "bg-emerald-50/50 border-emerald-100" : "bg-gray-50 border-gray-100 hover:border-gray-200"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleToggleSubtask(sub.id, !sub.done)}
                    className={`shrink-0 transition-colors ${sub.done ? "text-emerald-500" : "text-gray-300 hover:text-gray-500"}`}
                  >
                    {sub.done ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </button>
                  <span className={`flex-1 text-sm ${sub.done ? "line-through text-gray-400" : "text-gray-700 font-medium"}`}>
                    {sub.title}
                  </span>
                  {canModify && (
                    <button
                      type="button"
                      onClick={() => handleDeleteSubtask(sub.id)}
                      className="shrink-0 text-gray-300 hover:text-red-500 transition-colors p-0.5 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}

              {addingSubtask && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-red-200 bg-red-50/30">
                  <Plus className="w-4 h-4 text-red-400 shrink-0" />
                  <input
                    ref={subInputRef}
                    type="text"
                    value={newSubTitle}
                    onChange={(e) => setNewSubTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); handleAddSubtask(); setAddingSubtask(false); }
                      if (e.key === "Escape") { setNewSubTitle(""); setAddingSubtask(false); }
                    }}
                    placeholder="Escribe la subtarea y presiona Enter..."
                    className="flex-1 bg-transparent text-sm text-gray-800 placeholder-red-300 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => { handleAddSubtask(); setAddingSubtask(false); }}
                    className="text-[10px] font-black text-red-600 hover:text-red-700 shrink-0"
                  >
                    ✓ Add
                  </button>
                  <button
                    type="button"
                    onClick={() => { setNewSubTitle(""); setAddingSubtask(false); }}
                    className="text-[10px] text-gray-400 hover:text-gray-600 shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {subtasks.length === 0 && !addingSubtask && (
                <p className="text-xs text-gray-300 italic text-center py-2">Sin subtareas — agrega una para desglosar el trabajo</p>
              )}
            </div>
          </div>

          {/* ── Meta grid ───────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            {/* Due date */}
            <div className="bg-gray-50 rounded-2xl border border-gray-100 px-4 py-3">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> Fecha límite
              </p>
              <p className={`text-sm font-bold ${overdue ? "text-red-500" : "text-gray-800"}`}>
                {overdue && "⚠ "}{formatDate(task.dueDate)}
              </p>
            </div>

            {/* Story points */}
            <div className="bg-violet-50 rounded-2xl border border-violet-100 px-4 py-3">
              <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                <Zap className="w-3 h-3" /> Puntos (horas)
              </p>
              <p className="text-sm font-bold text-violet-700">
                {task.points > 0 ? `${task.points} punto${task.points !== 1 ? "s" : ""}` : "Sin estimar"}
              </p>
            </div>

            {/* Created by */}
            <div className="bg-gray-50 rounded-2xl border border-gray-100 px-4 py-3">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                <User className="w-3 h-3" /> Creado por
              </p>
              {task.createdBy ? (
                <div className="flex items-center gap-2">
                  <UserAvatar name={task.createdBy.name} size="xs" />
                  <span className="text-sm font-bold text-gray-800">{task.createdBy.name}</span>
                </div>
              ) : (
                <span className="text-sm text-gray-400">—</span>
              )}
            </div>

            {/* Created date */}
            <div className="bg-gray-50 rounded-2xl border border-gray-100 px-4 py-3">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Creada el
              </p>
              <p className="text-sm font-bold text-gray-800">{formatDate(task.createdAt)}</p>
            </div>
          </div>

          {/* ── Assignees ───────────────────────────────────────────── */}
          {task.assignees.length > 0 && (
            <div>
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2.5 flex items-center gap-1">
                <Users className="w-3 h-3" /> Asignado a
              </p>
              <div className="space-y-2">
                {task.assignees.map((a) => (
                  <div key={a.user.id} className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 rounded-2xl border border-gray-100">
                    <UserAvatar name={a.user.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800">{a.user.name}</p>
                      <p className="text-[11px] text-gray-400">{a.user.email}</p>
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-gray-200 text-gray-500">
                      {a.user.role === "ADMIN" ? "Admin" : "Vendedor"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 rounded-2xl border-2 border-gray-200 text-sm font-bold text-gray-600 hover:bg-white transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.92) translateY(12px); }
          to   { opacity: 1; transform: scale(1)   translateY(0);    }
        }
      `}</style>
    </div>
  );
}
