"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Plus, CheckCircle2, Clock, Loader2, CalendarDays, Trash2,
  Pencil, ListChecks, AlignLeft, AlertTriangle, Zap, Filter, Users,
  CheckSquare, Flag, Calendar,
} from "lucide-react";
import {
  createTaskAction, deleteTaskAction, moveTaskAction,
  reorderTasksAction, updateTaskAction, updateTaskStatusAction,
  type TaskPriority, type TaskStatus,
} from "@/app/dashboard/tasks/actions";
import { TaskModal } from "./TaskModal";
import { TaskDetailModal } from "./TaskDetailModal";
import { ConfirmModal } from "./ConfirmModal";
import { UserAvatar } from "@/components/ui/UserAvatar";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TaskUser { id: string; name: string; email: string; role: string; }
interface TaskTag { id: string; name: string; color: string; }

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
  initialTasks: Task[];
  users: TaskUser[];
  tags: TaskTag[];
  currentUserId: string;
  currentUserRole: string;
}

// ─── Column config ────────────────────────────────────────────────────────────

const COLUMNS: {
  id: TaskStatus; label: string; icon: React.ElementType;
  accentColor: string; headerBg: string; countBg: string; dropBg: string; emptyText: string;
}[] = [
  { id: "BACKLOG",     label: "Por Hacer",  icon: AlignLeft,     accentColor: "text-slate-600",   headerBg: "bg-slate-50 border-slate-100",   countBg: "bg-slate-100 text-slate-700",   dropBg: "border-slate-300 bg-slate-50/60",   emptyText: "Sin ideas registradas"    },
  { id: "PENDING",     label: "Pendiente",  icon: Clock,         accentColor: "text-amber-600",   headerBg: "bg-amber-50 border-amber-100",   countBg: "bg-amber-100 text-amber-700",   dropBg: "border-amber-300 bg-amber-50/60",   emptyText: "Sin tareas pendientes"    },
  { id: "IN_PROGRESS", label: "En Proceso", icon: Loader2,       accentColor: "text-blue-600",    headerBg: "bg-blue-50 border-blue-100",     countBg: "bg-blue-100 text-blue-700",     dropBg: "border-blue-300 bg-blue-50/60",     emptyText: "Nada en proceso"          },
  { id: "BLOCKED",     label: "Bloqueado",  icon: AlertTriangle, accentColor: "text-rose-600",    headerBg: "bg-rose-50 border-rose-100",     countBg: "bg-rose-100 text-rose-700",     dropBg: "border-rose-300 bg-rose-50/60",     emptyText: "Sin bloqueos"          },
  { id: "DONE",        label: "Terminado",  icon: CheckCircle2,  accentColor: "text-emerald-600", headerBg: "bg-emerald-50 border-emerald-100", countBg: "bg-emerald-100 text-emerald-700", dropBg: "border-emerald-300 bg-emerald-50/60", emptyText: "Nada terminado aún"   },
];

const PRIORITY_META: Record<TaskPriority, { label: string; color: string; dot: string }> = {
  LOW:    { label: "Baja",   color: "text-slate-500", dot: "bg-slate-400" },
  NORMAL: { label: "Normal", color: "text-amber-600", dot: "bg-amber-400" },
  HIGH:   { label: "Alta",   color: "text-red-600",   dot: "bg-red-500"   },
};

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
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

// ─── TaskCard ─────────────────────────────────────────────────────────────────

function TaskCard({
  task, currentUserId, currentUserRole,
  onEdit, onDelete, onDragStart, onCardClick,
}: {
  task: Task; currentUserId: string; currentUserRole: string;
  onEdit: (t: Task) => void; onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent, t: Task) => void;
  onCardClick: (t: Task) => void;
}) {
  const p = PRIORITY_META[task.priority] || PRIORITY_META["NORMAL"];
  const overdue = isOverdue(task.dueDate, task.status);
  const canModify = currentUserRole === "ADMIN" || task.createdById === currentUserId;
  const isBlocked = task.status === "BLOCKED";

  const showProgress = task.status === "IN_PROGRESS" || task.status === "BLOCKED" || task.status === "DONE";
  const displayProgress = task.status === "DONE" ? 100 : task.progress;

  const doneSubtasks = task.subtasks?.filter((s) => s.done).length ?? 0;
  const totalSubtasks = task.subtasks?.length ?? 0;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onClick={() => onCardClick(task)}
      className={`group bg-white rounded-2xl border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-4 cursor-pointer select-none
        ${isBlocked ? "border-rose-200 bg-rose-50/30" : "border-gray-100"}`}
    >
      {/* Priority + points + tags row */}
      <div className="flex flex-col gap-2 mb-3">
        <div className="flex items-center justify-between">
          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg ${
            isBlocked ? "bg-rose-100" : "bg-gray-100"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${p.color}`}>{p.label}</span>
          </div>
          <div className="flex items-center gap-2">
            {totalSubtasks > 0 && (
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border
                ${doneSubtasks === totalSubtasks ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                <CheckSquare className="w-2.5 h-2.5" /> {doneSubtasks}/{totalSubtasks}
              </span>
            )}
            {task.points > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-lg">
                <Zap className="w-2.5 h-2.5" />{task.points}h
              </span>
            )}
          </div>
        </div>
        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.tags.map(tag => (
              <span key={tag.id} className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Blocker badge */}
      {isBlocked && (
        <div className="flex items-center gap-1.5 mb-2 text-rose-600">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          <p className="text-[10px] font-black uppercase tracking-widest">Bloqueado</p>
        </div>
      )}

      {/* Title & actions */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-bold text-gray-800 leading-snug flex-1">{task.title}</p>
        {canModify && (
          <div
            className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => onEdit(task)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="Editar"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(task.id)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Eliminar"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-gray-400 mb-3 line-clamp-2 leading-relaxed">{task.description}</p>
      )}

      {/* Mini Progress Bar */}
      {showProgress && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Avance</span>
            <span className="text-[9px] font-bold text-gray-500">{displayProgress}%</span>
          </div>
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${getProgressColor(displayProgress)} transition-all duration-500`}
              style={{ width: `${displayProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-50">
        {task.dueDate ? (
          <span className={`flex items-center gap-1 text-[10px] font-semibold ${overdue ? "text-red-500" : "text-gray-400"}`}>
            <CalendarDays className="w-3 h-3" />{overdue && "⚠ "}{formatDate(task.dueDate)}
          </span>
        ) : <span />}
        {task.assignees.length > 0 && (
          <div className="flex -space-x-1.5 overflow-hidden">
            {task.assignees.map((a) => (
              <UserAvatar key={a.user.id} name={a.user.name} size="xs" className="ring-2 ring-white" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Column ───────────────────────────────────────────────────────────────────

function Column({
  col, tasks, totalPoints, currentUserId, currentUserRole,
  onAddClick, onEdit, onDelete, onDragStart, onDrop, onCardClick,
}: {
  col: typeof COLUMNS[number]; tasks: Task[]; totalPoints: number;
  currentUserId: string; currentUserRole: string;
  onAddClick: (s: TaskStatus) => void; onEdit: (t: Task) => void;
  onDelete: (id: string) => void; onDragStart: (e: React.DragEvent, t: Task) => void;
  onDrop: (e: React.DragEvent, s: TaskStatus, targetId?: string) => void;
  onCardClick: (t: Task) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div
      className={`flex flex-col rounded-3xl border-2 transition-all duration-200 w-full overflow-hidden ${
        isDragOver ? `${col.dropBg} shadow-xl` : "border-transparent bg-gray-50"
      }`}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false); }}
      onDrop={(e) => { setIsDragOver(false); onDrop(e, col.id); }}
    >
      {/* Header - Sticky */}
      <div className={`flex items-center justify-between px-4 py-3.5 border-b ${col.headerBg} sticky top-0 z-10 backdrop-blur-md`}>
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className={`p-1.5 rounded-lg shrink-0 ${col.countBg}`}>
            <col.icon className={`w-3.5 h-3.5 ${col.accentColor}`} />
          </div>
          <h2 className={`text-sm font-black uppercase tracking-widest whitespace-nowrap truncate ${col.accentColor}`}>{col.label}</h2>
          <span className={`text-[11px] font-black px-2 py-0.5 rounded-full shrink-0 ${col.countBg}`}>{tasks.length}</span>
          {totalPoints > 0 && (
            <span className="text-[10px] font-bold text-violet-500 flex items-center gap-0.5">
              <Zap className="w-2.5 h-2.5" />{totalPoints}h
            </span>
          )}
        </div>
        <button
          onClick={() => onAddClick(col.id)}
          title="Nueva tarea"
          className={`group w-8 h-8 rounded-xl ${col.countBg} ${col.accentColor} cursor-pointer
            flex items-center justify-center
            transition-all duration-200
            hover:scale-110 hover:shadow-md active:scale-95
            hover:ring-2 hover:ring-current hover:ring-offset-1`}
        >
          <Plus className="w-4 h-4 transition-transform duration-200 group-hover:rotate-90" />
        </button>
      </div>

      {/* Cards - Scrollable area */}
      <div className="flex flex-col gap-2.5 p-3 flex-1 overflow-y-auto custom-scrollbar min-h-[180px] max-h-[calc(100vh-320px)] md:max-h-[calc(100vh-280px)]">
        {tasks.map((task) => (
          <div
            key={task.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.stopPropagation(); onDrop(e, col.id, task.id); }}
          >
            <TaskCard
              task={task} currentUserId={currentUserId} currentUserRole={currentUserRole}
              onEdit={onEdit} onDelete={onDelete} onDragStart={onDragStart} onCardClick={onCardClick}
            />
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 py-10 text-gray-300">
            <col.icon className="w-9 h-9 opacity-40" />
            <p className="text-xs font-semibold">{col.emptyText}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Board ───────────────────────────────────────────────────────────────

export function TaskBoard({ initialTasks, users, tags, currentUserId, currentUserRole }: Props) {
  const [tasks, setTasks]             = useState<Task[]>(initialTasks);
  const [modalOpen, setModalOpen]     = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [detailTask, setDetailTask]   = useState<Task | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>("PENDING");
  const [confirmId, setConfirmId]     = useState<string | null>(null);
  
  // Filters
  const [filterUserIds, setFilterUserIds] = useState<string[]>([]);
  const [filterPriority, setFilterPriority] = useState<TaskPriority | null>(null);
  const [filterTagIds, setFilterTagIds] = useState<string[]>([]);
  
  const draggedTask = useRef<Task | null>(null);
  
  // Blocker prompt for drag & drop
  const [blockingDrop, setBlockingDrop] = useState<{
    src: Task;
    targetStatus: TaskStatus;
    newOrder: number;
  } | null>(null);
  const [dropBlockerReason, setDropBlockerReason] = useState("");

  // ── Filters ──────────────────────────────────────────────────────────────

  const toggleUserFilter = (uid: string) =>
    setFilterUserIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );

  const togglePriorityFilter = (prio: TaskPriority) =>
    setFilterPriority((prev) => (prev === prio ? null : prio));

  const filteredTasks = tasks.filter((t) => {
    if (filterPriority && t.priority !== filterPriority) return false;
    if (filterUserIds.length > 0 && !t.assignees.some((a) => filterUserIds.includes(a.user.id))) return false;
    if (filterTagIds.length > 0 && !t.tags.some((tag) => filterTagIds.includes(tag.id))) return false;
    return true;
  });

  const tasksByStatus = useCallback(
    (status: TaskStatus) =>
      filteredTasks.filter((t) => t.status === status).sort((a, b) => {
        // High -> Normal -> Low order is already somewhat preserved,
        // but we can enforce it explicitly here if we want:
        const prioOrder = { HIGH: 0, NORMAL: 1, LOW: 2 };
        if (a.priority !== b.priority) return prioOrder[a.priority] - prioOrder[b.priority];
        return a.order - b.order;
      }),
    [filteredTasks]
  );

  // ── Stats ─────────────────────────────────────────────────────────────────

  const total    = filteredTasks.length;
  const backlogCount = filteredTasks.filter((t) => t.status === "BACKLOG").length;
  const pendingCount = filteredTasks.filter((t) => t.status === "PENDING").length;
  const inProgressCount = filteredTasks.filter((t) => t.status === "IN_PROGRESS").length;
  const blockedCount = filteredTasks.filter((t) => t.status === "BLOCKED").length;
  const doneCount = filteredTasks.filter((t) => t.status === "DONE").length;
  const progressPercent = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  // Total points per user (for the filter bar)
  const pointsByUser = users.reduce<Record<string, number>>((acc, u) => {
    acc[u.id] = filteredTasks
      .filter((t) => t.assignees.some((a) => a.user.id === u.id))
      .reduce((s, t) => s + t.points, 0);
    return acc;
  }, {});

  // ── Drag & Drop ───────────────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    draggedTask.current = task;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus, targetTaskId?: string) => {
    e.preventDefault();
    const src = draggedTask.current;
    if (!src) return;

    const columnTasks = tasksByStatus(targetStatus).filter((t) => t.id !== src.id);
    let newOrder: number;
    if (targetTaskId) {
      const idx = columnTasks.findIndex((t) => t.id === targetTaskId);
      newOrder = idx >= 0 ? idx : columnTasks.length;
    } else {
      newOrder = columnTasks.length;
    }

    setTasks((prev) => {
      const without  = prev.filter((t) => t.id !== src.id);
      const colItems = without.filter((t) => t.status === targetStatus);
      const others   = without.filter((t) => t.status !== targetStatus);
      colItems.splice(newOrder, 0, { ...src, status: targetStatus });
      return [...others, ...colItems.map((t, i) => ({ ...t, order: i }))];
    });

    draggedTask.current = null;

    if (targetStatus === "BLOCKED" && src.status !== "BLOCKED") {
      setBlockingDrop({ src, targetStatus, newOrder });
      return;
    }

    await moveTaskAction(src.id, targetStatus, newOrder);
    const colItems = tasksByStatus(targetStatus).filter((t) => t.id !== src.id);
    colItems.splice(newOrder, 0, src);
    
    const itemsToReorder = colItems
      .filter((t) => !t.id.startsWith("tmp-"))
      .map((t, i) => ({ id: t.id, order: i }));
      
    if (itemsToReorder.length > 0) {
      await reorderTasksAction(itemsToReorder);
    }
  };

  const confirmBlockingDrop = async () => {
    if (!blockingDrop || !dropBlockerReason.trim()) return;
    const { src, targetStatus, newOrder } = blockingDrop;
    
    setTasks(prev => prev.map(t => t.id === src.id ? { ...t, blockerReason: dropBlockerReason, status: targetStatus } : t));
    
    if (src.id.startsWith("tmp-")) {
      setBlockingDrop(null);
      setDropBlockerReason("");
      return;
    }

    await moveTaskAction(src.id, targetStatus, newOrder, dropBlockerReason);
    
    const colItems = tasksByStatus(targetStatus).filter((t) => t.id !== src.id);
    colItems.splice(newOrder, 0, { ...src, blockerReason: dropBlockerReason, status: targetStatus });
    
    const itemsToReorder = colItems
      .filter((t) => !t.id.startsWith("tmp-"))
      .map((t, i) => ({ id: t.id, order: i }));

    if (itemsToReorder.length > 0) {
      await reorderTasksAction(itemsToReorder);
    }
    
    setBlockingDrop(null);
    setDropBlockerReason("");
  };

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const handleAddClick = (status: TaskStatus) => {
    setEditingTask(null);
    setDefaultStatus(status);
    setModalOpen(true);
  };

  const handleEdit = (task: Task) => {
    setDetailTask(null);
    setEditingTask(task);
    setModalOpen(true);
  };

  const handleDeleteRequest = (id: string) => setConfirmId(id);

  const handleDeleteConfirm = async () => {
    if (!confirmId) return;
    setTasks((prev) => prev.filter((t) => t.id !== confirmId));
    setConfirmId(null);
    await deleteTaskAction(confirmId);
  };

  const handleSave = async (data: {
    title: string; description?: string; priority: TaskPriority;
    points: number; progress: number; blockerReason?: string; dueDate?: string; assigneeIds: string[]; subtasks: { id: string; title: string }[]; tagIds: string[];
  }) => {
    setModalOpen(false);

    if (editingTask) {
      const existingIds = editingTask.subtasks.map((s) => s.id);
      const keptIds = data.subtasks.filter((s) => !s.id.startsWith("tmp-")).map((s) => s.id);
      const toDelete = existingIds.filter((id) => !keptIds.includes(id));
      const toCreate = data.subtasks.filter((s) => s.id.startsWith("tmp-")).map((s) => s.title);

      setTasks((prev) =>
        prev.map((t) =>
          t.id === editingTask.id
            ? {
                ...t,
                title: data.title,
                description: data.description ?? null,
                priority: data.priority,
                points: data.points,
                progress: data.progress,
                dueDate: data.dueDate ?? null,
                blockerReason: data.blockerReason ?? null,
                assignees: data.assigneeIds.map((uid) => ({ user: users.find((u) => u.id === uid)! })),
                tags: data.tagIds.map(tid => tags.find(t => t.id === tid)!),
                subtasks: data.subtasks.map((st, i) => {
                  const existing = t.subtasks.find(s => s.id === st.id);
                  return existing ? existing : { id: st.id, title: st.title, done: false, order: t.subtasks.length + i, createdAt: new Date().toISOString() };
                }),
              }
            : t
        )
      );
      await updateTaskAction(editingTask.id, {
        title: data.title, description: data.description,
        priority: data.priority, points: data.points, progress: data.progress,
        dueDate: data.dueDate || null, assigneeIds: data.assigneeIds,
        blockerReason: data.blockerReason ?? null,
        tagIds: data.tagIds,
        subtasksToCreate: toCreate,
        subtasksToDelete: toDelete,
      });
    } else {
      const tempId = `tmp-${Date.now()}`;
      const newTask: Task = {
        id: tempId, title: data.title, description: data.description ?? null,
        status: defaultStatus, priority: data.priority, points: data.points, progress: data.progress,
        blockerReason: data.blockerReason ?? null, 
        subtasks: data.subtasks.map((st, i) => ({ id: `tmp-st-${i}`, title: st.title, done: false, order: i, createdAt: new Date().toISOString() })),
        dueDate: data.dueDate ?? null, order: tasksByStatus(defaultStatus).length,
        createdById: currentUserId, createdBy: { id: currentUserId, name: "Tú" },
        assignees: data.assigneeIds.map((uid) => ({ user: users.find((u) => u.id === uid)! })),
        tags: data.tagIds.map(tid => tags.find(t => t.id === tid)!),
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      setTasks((prev) => [...prev, newTask]);
      const created = await createTaskAction({ 
        ...data, 
        createdById: currentUserId, 
        status: defaultStatus,
        subtasks: data.subtasks.map(s => s.title)
      });
      
      if (created) {
        setTasks((prev) => prev.map((t) => (t.id === tempId ? (created as any as Task) : t)));
      }
    }
  };

  const handleStatusChangeFromDetail = (taskId: string, newStatus: TaskStatus, blockerReason?: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: newStatus, blockerReason: blockerReason ?? null, progress: newStatus === "DONE" ? 100 : t.progress } : t
      )
    );
    if (detailTask?.id === taskId) {
      setDetailTask((prev) => prev ? { ...prev, status: newStatus, blockerReason: blockerReason ?? null, progress: newStatus === "DONE" ? 100 : prev.progress } : prev);
    }
  };

  const handleProgressChangeFromDetail = (taskId: string, progress: number) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, progress } : t
      )
    );
  };

  return (
    <div className="h-full flex flex-col gap-5">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-md shadow-red-500/25">
            <ListChecks className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Tareas del Equipo</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {total} tarea{total !== 1 ? "s" : ""} · {backlogCount} por hacer · {pendingCount} pendiente{pendingCount !== 1 ? "s" : ""} · {inProgressCount} en proceso · {blockedCount} bloqueada{blockedCount !== 1 ? "s" : ""} · {doneCount} completada{doneCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/tasks/calendar"
            className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-gray-600 hover:text-indigo-700 text-sm font-black rounded-2xl transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <Calendar className="w-4 h-4" /> Calendario
          </Link>
          <button
            onClick={() => handleAddClick("PENDING")}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-sm font-black rounded-2xl shadow-lg shadow-red-600/25 transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <Plus className="w-4 h-4" /> Nueva Tarea
          </button>
        </div>
      </div>

      {/* ── Progress bar ─────────────────────────────────────────────────── */}
      {total > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-700"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs font-black text-gray-400 shrink-0">{progressPercent}%</span>
        </div>
      )}

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        {/* Priority Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-black text-gray-400 uppercase tracking-widest shrink-0">
            <Flag className="w-3.5 h-3.5" /> Prioridad:
          </div>
          <button
            onClick={() => setFilterPriority(null)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all
              ${filterPriority === null
                ? "bg-gray-900 border-gray-900 text-white shadow-sm"
                : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
          >
            Todas
          </button>
          {(["HIGH", "NORMAL", "LOW"] as TaskPriority[]).map((p) => {
            const active = filterPriority === p;
            const meta = PRIORITY_META[p];
            return (
              <button
                key={p}
                onClick={() => togglePriorityFilter(p)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all
                  ${active
                    ? "bg-gray-800 border-gray-800 text-white shadow-sm"
                    : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
              >
                <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                {meta.label}
              </button>
            );
          })}
        </div>

        {/* Tags Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-black text-gray-400 uppercase tracking-widest shrink-0">
            <Filter className="w-3.5 h-3.5" /> Categoría:
          </div>
          <button
            onClick={() => setFilterTagIds([])}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all
              ${filterTagIds.length === 0
                ? "bg-gray-900 border-gray-900 text-white shadow-sm"
                : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
          >
            Todas
          </button>
          {tags.map((tag) => {
            const active = filterTagIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                onClick={() => setFilterTagIds(prev => prev.includes(tag.id) ? prev.filter(id => id !== tag.id) : [...prev, tag.id])}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all
                  ${active
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm"
                    : "bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700"
                  }`}
              >
                {tag.name}
              </button>
            );
          })}
        </div>

        {/* User Filter */}
        {users.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-black text-gray-400 uppercase tracking-widest shrink-0">
              <Users className="w-3.5 h-3.5" /> Asignado:
            </div>
            <button
              onClick={() => setFilterUserIds([])}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all
                ${filterUserIds.length === 0
                  ? "bg-gray-900 border-gray-900 text-white shadow-sm"
                  : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
            >
              Todos
            </button>
            {users.map((u) => {
              const active = filterUserIds.includes(u.id);
              const pts = pointsByUser[u.id] ?? 0;
              return (
                <button
                  key={u.id}
                  onClick={() => toggleUserFilter(u.id)}
                  className={`flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl border text-xs font-bold transition-all
                    ${active
                      ? "bg-red-600 border-red-600 text-white shadow-sm"
                      : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                >
                  <UserAvatar name={u.name} size="xs" />
                  <span>{u.name.split(" ")[0]}</span>
                  {pts > 0 && (
                    <span className={`flex items-center gap-0.5 text-[10px] font-black ${active ? "text-white/80" : "text-violet-500"}`}>
                      <Zap className="w-2.5 h-2.5" />{pts}h
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Kanban Board ─────────────────────────────────────────────────── */}
      <div className="flex gap-4 flex-1 overflow-x-auto pb-2">
        {COLUMNS.map((col) => {
          const colTasks = tasksByStatus(col.id);
          const colPoints = colTasks.reduce((s, t) => s + t.points, 0);
          return (
            <div key={col.id} className="flex-1 min-w-[320px] max-w-[400px]">
              <Column
                col={col} tasks={colTasks} totalPoints={colPoints}
                currentUserId={currentUserId} currentUserRole={currentUserRole}
                onAddClick={handleAddClick} onEdit={handleEdit}
                onDelete={handleDeleteRequest} onDragStart={handleDragStart}
                onDrop={handleDrop} onCardClick={setDetailTask}
              />
            </div>
          );
        })}
      </div>

      {/* ── Edit Modal ───────────────────────────────────────────────────── */}
      {modalOpen && (
        <TaskModal
          task={editingTask}
          initialStatus={defaultStatus}
          users={users}
          tags={tags}
          currentUserRole={currentUserRole}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}

      {/* ── Detail Modal (click on card) ─────────────────────────────────── */}
      {detailTask && (
        <TaskDetailModal
          task={detailTask}
          currentUserRole={currentUserRole}
          currentUserId={currentUserId}
          onClose={() => {
            setDetailTask(null);
            // Re-fetch or at least refresh local state from detail modifications might be needed,
            // but handleStatusChangeFromDetail and other optimistics already updated it mostly.
          }}
          onEdit={handleEdit}
          onStatusChange={handleStatusChangeFromDetail}
          onProgressChange={handleProgressChangeFromDetail}
        />
      )}

      {/* ── Confirm Delete ───────────────────────────────────────────────── */}
      {confirmId && (
        <ConfirmModal
          title="¿Eliminar tarea?"
          message="Esta acción no se puede deshacer. La tarea se eliminará permanentemente."
          confirmLabel="Sí, eliminar"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setConfirmId(null)}
        />
      )}

      {/* ── Blocker Prompt (Drag & Drop) ──────────────────────────────────── */}
      {blockingDrop && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900 tracking-tight">Tarea Bloqueada</h3>
                <p className="text-xs text-gray-400">Describe el motivo del bloqueo para continuar.</p>
              </div>
            </div>

            <textarea
              value={dropBlockerReason}
              onChange={(e) => setDropBlockerReason(e.target.value)}
              placeholder="¿Qué se necesita para desbloquear esta tarea?"
              className="w-full px-4 py-3 rounded-2xl border-2 border-rose-100 text-sm text-gray-800 placeholder-rose-300 focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 transition-all resize-none bg-gray-50/50"
              rows={3}
              autoFocus
            />

            <div className="flex gap-3">
              <button
                onClick={() => { setBlockingDrop(null); setDropBlockerReason(""); }}
                className="flex-1 px-4 py-2.5 rounded-2xl border-2 border-gray-100 text-sm font-bold text-gray-400 hover:bg-gray-50 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={confirmBlockingDrop}
                disabled={!dropBlockerReason.trim()}
                className="flex-1 px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-black shadow-lg shadow-rose-600/20 transition-all disabled:opacity-50"
              >
                Bloquear Tarea
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
