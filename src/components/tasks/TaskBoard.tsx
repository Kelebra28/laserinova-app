"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import {
  Plus, CheckCircle2, Clock, Loader2, CalendarDays, Trash2,
  Pencil, AlignLeft, AlertTriangle, Zap,
  CheckSquare, Calendar, Search, X, SlidersHorizontal,
} from "lucide-react";
import {
  createTaskAction, deleteTaskAction, moveAndReorderTasksAction,
  getOlderDoneTasksAction, updateTaskAction,
  type TaskPriority, type TaskStatus,
} from "@/app/dashboard/tasks/actions";
import { TaskModal } from "./TaskModal";
import { TaskDetailModal } from "./TaskDetailModal";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import { UserAvatar } from "@/components/ui/UserAvatar";
import MenuSelect from "@/components/ui/MenuSelect";
import { isDatePast, formatDueDate, todayYMD } from "@/lib/dates";

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
  /** Terminadas fuera de la ventana de 30 días (se cargan bajo demanda). */
  olderDoneCount: number;
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

const STATUS_DOTS: Record<TaskStatus, string> = {
  BACKLOG: "bg-slate-400",
  PENDING: "bg-amber-400",
  IN_PROGRESS: "bg-blue-500",
  BLOCKED: "bg-rose-500",
  DONE: "bg-emerald-500",
};

const STATUS_OPTIONS = COLUMNS.map((c) => ({ value: c.id, label: c.label, dot: STATUS_DOTS[c.id] }));

const PRIORITY_META: Record<TaskPriority, { label: string; color: string; dot: string }> = {
  LOW:    { label: "Baja",   color: "text-slate-500", dot: "bg-slate-400" },
  NORMAL: { label: "Normal", color: "text-amber-600", dot: "bg-amber-400" },
  HIGH:   { label: "Alta",   color: "text-red-600",   dot: "bg-red-500"   },
};

const PRIORITY_RANK: Record<TaskPriority, number> = { HIGH: 0, NORMAL: 1, LOW: 2 };

function sortTasks(a: Task, b: Task) {
  if (a.priority !== b.priority) return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  return a.order - b.order;
}

/** Progreso coherente al cambiar de columna (espejo de la regla del servidor). */
function progressAfterMove(prevStatus: TaskStatus, prevProgress: number, next: TaskStatus) {
  if (next === "DONE") return 100;
  if (next === "BACKLOG" || next === "PENDING") return 0;
  if (prevStatus === "DONE" && prevProgress >= 100) return 90;
  return prevProgress;
}

const makeTempId = () => `tmp-${Date.now()}`;

function errMsg(err: unknown, fallback: string) {
  return err instanceof Error && err.message ? err.message : fallback;
}

function formatDate(iso: string | null) {
  if (!iso) return null;
  return formatDueDate(iso);
}

function isOverdue(iso: string | null, status: TaskStatus) {
  if (!iso || status === "DONE") return false;
  return isDatePast(iso);
}

function getProgressColor(p: number) {
  if (p >= 80) return "from-emerald-400 to-emerald-600";
  if (p >= 40) return "from-blue-400 to-indigo-500";
  return "from-amber-400 to-orange-500";
}

// ─── TaskCard ─────────────────────────────────────────────────────────────────

function TaskCard({
  task, currentUserId, currentUserRole,
  onEdit, onDelete, onDragStart, onCardClick, onMove,
}: {
  task: Task; currentUserId: string; currentUserRole: string;
  onEdit: (t: Task) => void; onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent, t: Task) => void;
  onCardClick: (t: Task) => void;
  onMove: (t: Task, status: TaskStatus) => void;
}) {
  const p = PRIORITY_META[task.priority] || PRIORITY_META["NORMAL"];
  const overdue = isOverdue(task.dueDate, task.status);
  const canModify = currentUserRole === "ADMIN" || task.createdById === currentUserId;
  const isBlocked = task.status === "BLOCKED";
  const isTemp = task.id.startsWith("tmp-");

  const showProgress = task.status === "IN_PROGRESS" || task.status === "BLOCKED" || task.status === "DONE";
  const displayProgress = task.status === "DONE" ? 100 : task.progress;

  const doneSubtasks = task.subtasks?.filter((s) => s.done).length ?? 0;
  const totalSubtasks = task.subtasks?.length ?? 0;

  return (
    <div
      draggable={!isTemp}
      onDragStart={(e) => onDragStart(e, task)}
      onClick={() => onCardClick(task)}
      onKeyDown={(e) => {
        // Solo cuando el foco está en la tarjeta misma, no en sus botones o selector
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onCardClick(task);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${task.title}. Prioridad ${p.label}${overdue ? ". Vencida" : ""}`}
      className={`group bg-white rounded-2xl border shadow-sm hover:shadow-md transition-shadow duration-200 p-4 cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-red-500/40
        ${isBlocked ? "border-rose-200 bg-rose-50/30" : overdue ? "border-red-200" : "border-gray-100"}`}
    >
      {/* Prioridad + etiquetas */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600">
          <span className={`w-2 h-2 rounded-full ${p.dot}`} />
          {p.label}
        </span>
        {task.tags?.map((tag) => (
          <span key={tag.id} className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
            {tag.name}
          </span>
        ))}
        <div className="ml-auto flex items-center gap-1.5">
          {totalSubtasks > 0 && (
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-md
              ${doneSubtasks === totalSubtasks ? "bg-emerald-50 text-emerald-700" : "bg-gray-50 text-gray-500"}`}>
              <CheckSquare className="w-3 h-3" /> {doneSubtasks}/{totalSubtasks}
            </span>
          )}
          {task.points > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded-md">
              <Zap className="w-3 h-3" />{task.points}h
            </span>
          )}
        </div>
      </div>

      {/* Título y acciones: visibles al pasar el mouse, con foco y siempre en pantallas táctiles */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-sm font-semibold text-gray-900 leading-snug flex-1">{task.title}</p>
        {canModify && !isTemp && (
          <div
            className="flex gap-0.5 shrink-0 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => onEdit(task)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="Editar"
              aria-label={`Editar ${task.title}`}
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(task.id)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Eliminar"
              aria-label={`Eliminar ${task.title}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {isBlocked && (
        <p className="flex items-start gap-1.5 text-xs text-rose-700 mb-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
          <span className="line-clamp-2">{task.blockerReason || "Bloqueada"}</span>
        </p>
      )}

      {task.description && !isBlocked && (
        <p className="text-xs text-gray-500 mb-2 line-clamp-2 leading-relaxed">{task.description}</p>
      )}

      {showProgress && (
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-gray-400">Avance</span>
            <span className="text-[11px] font-semibold text-gray-500">{displayProgress}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${getProgressColor(displayProgress)} transition-all duration-500`}
              style={{ width: `${displayProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Pie: fecha, responsables y selector de estatus (alternativa al arrastre: táctil y teclado) */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-50">
        <div className="flex items-center gap-2 min-w-0">
          {task.dueDate ? (
            <span className={`flex items-center gap-1 text-xs font-medium ${overdue ? "text-red-600" : "text-gray-500"}`}>
              <CalendarDays className="w-3.5 h-3.5" />{overdue && "Vencida · "}{formatDate(task.dueDate)}
            </span>
          ) : null}
          {task.assignees.length > 0 && (
            <div className="flex -space-x-1.5 overflow-hidden">
              {task.assignees.map((a) => (
                <UserAvatar key={a.user.id} name={a.user.name} size="xs" className="ring-2 ring-white" />
              ))}
            </div>
          )}
        </div>
        {!isTemp && (
          <MenuSelect
            ariaLabel={`Mover ${task.title} a otro estatus`}
            value={task.status}
            options={STATUS_OPTIONS}
            onChange={(v) => onMove(task, v as TaskStatus)}
          />
        )}
      </div>
    </div>
  );
}

// ─── Column ───────────────────────────────────────────────────────────────────

/** Tareas automáticas de seguimiento: se agrupan para no inundar la columna. */
const FOLLOW_UP = /^Seguimiento de Cotizaci[oó]n/i;

function Column({
  col, tasks, totalPoints, currentUserId, currentUserRole,
  onAddClick, onEdit, onDelete, onDragStart, onDrop, onCardClick, onMove, footer, forceExpand,
}: {
  footer?: React.ReactNode;
  forceExpand: boolean;
  col: typeof COLUMNS[number]; tasks: Task[]; totalPoints: number;
  currentUserId: string; currentUserRole: string;
  onAddClick: (s: TaskStatus) => void; onEdit: (t: Task) => void;
  onDelete: (id: string) => void; onDragStart: (e: React.DragEvent, t: Task) => void;
  onDrop: (e: React.DragEvent, s: TaskStatus, targetId?: string) => void;
  onCardClick: (t: Task) => void;
  onMove: (t: Task, status: TaskStatus) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [followUpsOpen, setFollowUpsOpen] = useState(false);

  const followUps = col.id === "DONE" ? [] : tasks.filter((t) => FOLLOW_UP.test(t.title));
  const grouped = followUps.length >= 3;
  const regular = grouped ? tasks.filter((t) => !FOLLOW_UP.test(t.title)) : tasks;
  const showFollowUps = grouped && (followUpsOpen || forceExpand);

  const renderCard = (task: Task) => (
    <div
      key={task.id}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.stopPropagation(); onDrop(e, col.id, task.id); }}
    >
      <TaskCard
        task={task} currentUserId={currentUserId} currentUserRole={currentUserRole}
        onEdit={onEdit} onDelete={onDelete} onDragStart={onDragStart} onCardClick={onCardClick} onMove={onMove}
      />
    </div>
  );

  return (
    <div
      className={`flex flex-col rounded-3xl border-2 transition-all duration-200 w-full overflow-hidden ${
        isDragOver ? `${col.dropBg} shadow-xl` : "border-transparent bg-gray-50"
      }`}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false); }}
      onDrop={(e) => { setIsDragOver(false); onDrop(e, col.id); }}
    >
      <div className={`flex items-center justify-between px-4 py-3 border-b ${col.headerBg} sticky top-0 z-10 backdrop-blur-md`}>
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className={`p-1.5 rounded-lg shrink-0 ${col.countBg}`}>
            <col.icon className={`w-4 h-4 ${col.accentColor}`} />
          </div>
          <h2 className={`text-sm font-bold whitespace-nowrap truncate ${col.accentColor}`}>{col.label}</h2>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${col.countBg}`}>{tasks.length}</span>
          {totalPoints > 0 && (
            <span className="text-xs font-semibold text-violet-600 flex items-center gap-0.5">
              <Zap className="w-3 h-3" />{totalPoints}h
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onAddClick(col.id)}
          title="Nueva tarea"
          aria-label={`Nueva tarea en ${col.label}`}
          className={`w-8 h-8 rounded-xl ${col.countBg} ${col.accentColor} flex items-center justify-center transition-transform hover:scale-110 active:scale-95`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-col gap-2.5 p-3 flex-1 overflow-y-auto custom-scrollbar min-h-[180px] max-h-[calc(100vh-340px)] md:max-h-[calc(100vh-300px)]">
        {regular.map(renderCard)}

        {grouped && (
          <>
            <button
              type="button"
              onClick={() => setFollowUpsOpen((o) => !o)}
              aria-expanded={showFollowUps}
              className="w-full flex items-center justify-between gap-2 rounded-2xl border border-dashed border-gray-300 bg-white/70 px-4 py-3 text-left hover:bg-white transition-colors"
            >
              <span>
                <span className="block text-sm font-semibold text-gray-800">Seguimientos de cotización</span>
                <span className="block text-xs text-gray-500">{followUps.length} tareas automáticas</span>
              </span>
              <span className="text-xs font-semibold text-gray-500">{showFollowUps ? "Ocultar" : "Ver"}</span>
            </button>
            {showFollowUps && followUps.map(renderCard)}
          </>
        )}

        {footer}
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

export function TaskBoard({ initialTasks, olderDoneCount, users, tags, currentUserId, currentUserRole }: Props) {
  const [tasks, setTasks]             = useState<Task[]>(initialTasks);
  const [modalOpen, setModalOpen]     = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [detailTask, setDetailTask]   = useState<Task | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>("PENDING");
  const [confirmId, setConfirmId]     = useState<string | null>(null);
  const router = useRouter();

  // Operaciones en curso: mientras haya alguna no se pisa el estado local con datos del servidor
  const [inFlight, setInFlight] = useState(0);
  const track = async <T,>(fn: () => Promise<T>): Promise<T> => {
    setInFlight((n) => n + 1);
    try {
      return await fn();
    } finally {
      setInFlight((n) => n - 1);
    }
  };

  // Sincroniza con el servidor cuando llegan datos nuevos (cambios de compañeros, revalidaciones)
  const [syncedFrom, setSyncedFrom] = useState(initialTasks);
  // Terminadas antiguas cargadas con "Cargar anteriores": se conservan al sincronizar
  const [archivedIds, setArchivedIds] = useState<Set<string>>(new Set());
  const [loadingOlder, setLoadingOlder] = useState(false);
  if (syncedFrom !== initialTasks) {
    setSyncedFrom(initialTasks);
    if (inFlight === 0) {
      setTasks((prev) => {
        const fresh = new Set(initialTasks.map((t) => t.id));
        return [...initialTasks, ...prev.filter((t) => archivedIds.has(t.id) && !fresh.has(t.id))];
      });
    }
  }

  const loadOlderDone = async () => {
    setLoadingOlder(true);
    try {
      const older = (await getOlderDoneTasksAction(archivedIds.size)) as unknown as Task[];
      setTasks((prev) => {
        const have = new Set(prev.map((t) => t.id));
        return [...prev, ...older.filter((t) => !have.has(t.id))];
      });
      setArchivedIds((prev) => new Set([...prev, ...older.map((t) => t.id)]));
    } catch (err) {
      toast.error(errMsg(err, "No se pudieron cargar las tareas anteriores"));
    } finally {
      setLoadingOlder(false);
    }
  };
  const remainingOlder = Math.max(0, olderDoneCount - archivedIds.size);
  
  // Filters
  const [filterUserIds, setFilterUserIds] = useState<string[]>([]);
  const [filterPriority, setFilterPriority] = useState<TaskPriority | null>(null);
  const [filterTagIds, setFilterTagIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);
  const [quick, setQuick] = useState<"overdue" | "today" | "blocked" | "progress" | null>(null);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  
  const draggedTask = useRef<Task | null>(null);
  
  // Blocker prompt for drag & drop
  const [blockingDrop, setBlockingDrop] = useState<{
    src: Task;
    targetStatus: TaskStatus;
    targetTaskId?: string;
  } | null>(null);
  const [dropBlockerReason, setDropBlockerReason] = useState("");

  // Refresco periódico (cada 30 s, solo con la pestaña visible y sin modales abiertos)
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible" && !modalOpen && !detailTask && !blockingDrop) router.refresh();
    }, 30000);
    return () => clearInterval(id);
  }, [router, modalOpen, detailTask, blockingDrop]);

  // ── Filters ──────────────────────────────────────────────────────────────

  const toggleUserFilter = (uid: string) =>
    setFilterUserIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );

  const togglePriorityFilter = (prio: TaskPriority) =>
    setFilterPriority((prev) => (prev === prio ? null : prio));

  const searchLower = search.trim().toLowerCase();
  const today = todayYMD();

  const matchesQuick = (t: Task) => {
    if (!quick) return true;
    if (quick === "overdue") return t.status !== "DONE" && isOverdue(t.dueDate, t.status);
    if (quick === "today") return t.status !== "DONE" && t.dueDate?.slice(0, 10) === today;
    if (quick === "blocked") return t.status === "BLOCKED";
    return t.status === "IN_PROGRESS";
  };

  const filteredTasks = tasks.filter((t) => {
    if (filterPriority && t.priority !== filterPriority) return false;
    if (onlyMine && !t.assignees.some((a) => a.user.id === currentUserId)) return false;
    if (filterUserIds.length > 0 && !t.assignees.some((a) => filterUserIds.includes(a.user.id))) return false;
    if (filterTagIds.length > 0 && !t.tags.some((tag) => filterTagIds.includes(tag.id))) return false;
    if (!matchesQuick(t)) return false;
    if (searchLower) {
      const haystack = [t.title, t.description ?? "", ...t.tags.map((x) => x.name), ...t.assignees.map((a) => a.user.name)]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(searchLower)) return false;
    }
    return true;
  });

  const hasFilters =
    !!filterPriority || onlyMine || filterUserIds.length > 0 || filterTagIds.length > 0 || !!quick || !!searchLower;

  const clearFilters = () => {
    setFilterPriority(null);
    setOnlyMine(false);
    setFilterUserIds([]);
    setFilterTagIds([]);
    setQuick(null);
    setSearch("");
  };

  const tasksByStatus = (status: TaskStatus) =>
    filteredTasks.filter((t) => t.status === status).sort(sortTasks);

  // ── Resumen (sobre todas las tareas cargadas, sin filtros) ───────────────

  const openTasks = tasks.filter((t) => t.status !== "DONE");
  const summary = {
    overdue: openTasks.filter((t) => isOverdue(t.dueDate, t.status)).length,
    today: openTasks.filter((t) => t.dueDate?.slice(0, 10) === today).length,
    blocked: tasks.filter((t) => t.status === "BLOCKED").length,
    progress: tasks.filter((t) => t.status === "IN_PROGRESS").length,
  };

  // Total de horas por usuario (para la barra de filtros)
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

  /**
   * Mueve una tarea y reordena la columna destino COMPLETA (incluidas tareas ocultas por filtros).
   * Si el servidor falla, se restaura el estado anterior.
   */
  const moveTask = async (src: Task, targetStatus: TaskStatus, targetTaskId?: string, blockerReason?: string) => {
    const snapshot = tasks;
    const column = tasks.filter((t) => t.status === targetStatus && t.id !== src.id).sort(sortTasks);
    const idx = targetTaskId ? column.findIndex((t) => t.id === targetTaskId) : -1;
    const moved: Task = {
      ...src,
      status: targetStatus,
      blockerReason: targetStatus === "BLOCKED" ? blockerReason?.trim() || src.blockerReason || "Sin motivo registrado" : null,
      progress: progressAfterMove(src.status, src.progress, targetStatus),
    };
    column.splice(idx >= 0 ? idx : column.length, 0, moved);
    const ordered = column.map((t, i) => ({ ...t, order: i }));
    const previousOrder = new Map(tasks.map((t) => [t.id, t.order]));
    const changed = ordered
      .filter((t) => !t.id.startsWith("tmp-") && (t.id === src.id || previousOrder.get(t.id) !== t.order))
      .map((t) => ({ id: t.id, order: t.order }));

    setTasks((prev) => [...prev.filter((t) => t.status !== targetStatus && t.id !== src.id), ...ordered]);

    try {
      const res = await track(() =>
        moveAndReorderTasksAction(src.id, targetStatus, moved.blockerReason ?? undefined, changed)
      );
      if (res && res.success === false) throw new Error("La tarea ya no existe");
    } catch (err) {
      setTasks(snapshot);
      toast.error(errMsg(err, "No se pudo mover la tarea"));
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus, targetTaskId?: string) => {
    e.preventDefault();
    const src = draggedTask.current;
    draggedTask.current = null;
    if (!src || src.id.startsWith("tmp-")) return;
    if (src.status === targetStatus && src.id === targetTaskId) return;

    // Bloquear exige un motivo: se pregunta ANTES de mover nada, así cancelar no deja rastro
    if (targetStatus === "BLOCKED" && src.status !== "BLOCKED") {
      setBlockingDrop({ src, targetStatus, targetTaskId });
      return;
    }
    await moveTask(src, targetStatus, targetTaskId);
  };

  const confirmBlockingDrop = async () => {
    if (!blockingDrop || !dropBlockerReason.trim()) return;
    const { src, targetStatus, targetTaskId } = blockingDrop;
    const reason = dropBlockerReason.trim();
    setBlockingDrop(null);
    setDropBlockerReason("");
    await moveTask(src, targetStatus, targetTaskId, reason);
  };

  /** Cambio de estatus desde el selector de la tarjeta (táctil y teclado): mismas reglas que arrastrar. */
  const handleStatusSelect = async (task: Task, status: TaskStatus) => {
    if (task.id.startsWith("tmp-") || task.status === status) return;
    if (status === "BLOCKED") {
      setBlockingDrop({ src: task, targetStatus: status });
      return;
    }
    await moveTask(task, status);
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
    const id = confirmId;
    const snapshot = tasks;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setConfirmId(null);
    try {
      await track(() => deleteTaskAction(id)); // si ya no existía, el resultado es el mismo
    } catch (err) {
      setTasks(snapshot);
      toast.error(errMsg(err, "No se pudo eliminar la tarea"));
    }
  };

  const handleSave = async (data: {
    title: string; description?: string; priority: TaskPriority;
    points: number; progress: number; blockerReason?: string; dueDate?: string; assigneeIds: string[]; subtasks: { id: string; title: string }[]; tagIds: string[];
  }) => {
    setModalOpen(false);
    const snapshot = tasks;

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
                dueDate: data.dueDate ? `${data.dueDate.slice(0, 10)}T12:00:00.000Z` : null,
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
      try {
        const res = await track(() => updateTaskAction(editingTask.id, {
          title: data.title, description: data.description,
          priority: data.priority, points: data.points, progress: data.progress,
          dueDate: data.dueDate || null, assigneeIds: data.assigneeIds,
          blockerReason: data.blockerReason ?? null,
          tagIds: data.tagIds,
          subtasksToCreate: toCreate,
          subtasksToDelete: toDelete,
        }));
        if (res && res.success === false) throw new Error("La tarea ya no existe");
      } catch (err) {
        setTasks(snapshot);
        toast.error(errMsg(err, "No se pudieron guardar los cambios"));
      }
    } else {
      const tempId = makeTempId();
      const newTask: Task = {
        id: tempId, title: data.title, description: data.description ?? null,
        status: defaultStatus, priority: data.priority, points: data.points, progress: data.progress,
        blockerReason: data.blockerReason ?? null, 
        subtasks: data.subtasks.map((st, i) => ({ id: `tmp-st-${i}`, title: st.title, done: false, order: i, createdAt: new Date().toISOString() })),
        dueDate: data.dueDate ? `${data.dueDate.slice(0, 10)}T12:00:00.000Z` : null, order: tasksByStatus(defaultStatus).length,
        createdById: currentUserId, createdBy: { id: currentUserId, name: "Tú" },
        assignees: data.assigneeIds.map((uid) => ({ user: users.find((u) => u.id === uid)! })),
        tags: data.tagIds.map(tid => tags.find(t => t.id === tid)!),
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      setTasks((prev) => [...prev, newTask]);
      try {
        const created = await track(() => createTaskAction({
          ...data,
          status: defaultStatus,
          subtasks: data.subtasks.map(s => s.title)
        }));
        if (created) {
          setTasks((prev) => prev.map((t) => (t.id === tempId ? (created as unknown as Task) : t)));
        }
      } catch (err) {
        setTasks((prev) => prev.filter((t) => t.id !== tempId));
        toast.error(errMsg(err, "No se pudo crear la tarea"));
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

  const summaryCards: { key: "overdue" | "today" | "blocked" | "progress"; label: string; value: number; tone: string }[] = [
    { key: "overdue", label: "Vencidas", value: summary.overdue, tone: summary.overdue > 0 ? "text-red-600" : "text-gray-900" },
    { key: "today", label: "Vencen hoy", value: summary.today, tone: summary.today > 0 ? "text-amber-600" : "text-gray-900" },
    { key: "blocked", label: "Bloqueadas", value: summary.blocked, tone: summary.blocked > 0 ? "text-rose-600" : "text-gray-900" },
    { key: "progress", label: "En proceso", value: summary.progress, tone: "text-blue-600" },
  ];

  const chip = (active: boolean) =>
    `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
      active ? "bg-gray-900 border-gray-900 text-white" : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
    }`;

  return (
    <div className="h-full flex flex-col gap-4">
      {/* ── Encabezado ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Tareas del equipo</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {openTasks.length} abiertas · {tasks.length - openTasks.length} terminadas recientes
            {hasFilters && <span className="text-gray-400"> · mostrando {filteredTasks.length}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/tasks/calendar"
            className="inline-flex items-center gap-2 h-10 px-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition-colors"
          >
            <Calendar className="w-4 h-4" /> Calendario
          </Link>
          <button
            type="button"
            onClick={() => handleAddClick("PENDING")}
            className="inline-flex items-center gap-2 h-10 px-5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors active:scale-95"
          >
            <Plus className="w-4 h-4" /> Nueva tarea
          </button>
        </div>
      </div>

      {/* ── Resumen: cada tarjeta también filtra ────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {summaryCards.map((c) => {
          const active = quick === c.key;
          return (
            <button
              key={c.key}
              type="button"
              aria-pressed={active}
              onClick={() => setQuick(active ? null : c.key)}
              className={`text-left rounded-2xl border bg-white px-4 py-3 transition-colors ${
                active ? "border-red-500 ring-2 ring-red-500/15" : "border-gray-100 hover:border-gray-200"
              }`}
            >
              <p className="text-xs font-semibold text-gray-500">{c.label}</p>
              <p className={`text-2xl font-black tabular-nums ${c.tone}`}>{c.value}</p>
            </button>
          );
        })}
      </div>

      {/* ── Filtros ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar tarea, categoría o persona…"
              aria-label="Buscar tareas"
              className="w-full h-10 pl-9 pr-9 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} aria-label="Limpiar búsqueda" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button type="button" aria-pressed={onlyMine} onClick={() => setOnlyMine((v) => !v)} className={chip(onlyMine)}>
            Mis tareas
          </button>

          {(["HIGH", "NORMAL", "LOW"] as TaskPriority[]).map((pr) => {
            const meta = PRIORITY_META[pr];
            return (
              <button
                key={pr}
                type="button"
                aria-pressed={filterPriority === pr}
                onClick={() => togglePriorityFilter(pr)}
                className={chip(filterPriority === pr)}
              >
                <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                {meta.label}
              </button>
            );
          })}

          <button type="button" aria-expanded={showMoreFilters} onClick={() => setShowMoreFilters((v) => !v)} className={chip(showMoreFilters || filterTagIds.length > 0 || filterUserIds.length > 0)}>
            <SlidersHorizontal className="w-4 h-4" />
            Más filtros
          </button>

          {hasFilters && (
            <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 text-sm font-semibold text-red-600 hover:text-red-700">
              <X className="w-4 h-4" /> Limpiar
            </button>
          )}
        </div>

        {showMoreFilters && (
          <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-gray-500 w-24 shrink-0">Categoría</span>
              {tags.map((tag) => {
                const active = filterTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFilterTagIds((prev) => (prev.includes(tag.id) ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]))}
                    className={chip(active)}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
            {users.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-gray-500 w-24 shrink-0">Responsable</span>
                {users.map((u) => {
                  const active = filterUserIds.includes(u.id);
                  const pts = pointsByUser[u.id] ?? 0;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleUserFilter(u.id)}
                      className={`inline-flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl border text-sm font-medium transition-colors ${
                        active ? "bg-red-600 border-red-600 text-white" : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <UserAvatar name={u.name} size="xs" />
                      <span>{u.name.split(" ")[0]}</span>
                      {pts > 0 && (
                        <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${active ? "text-white/80" : "text-violet-600"}`}>
                          <Zap className="w-3 h-3" />{pts}h
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Tablero ─────────────────────────────────────────────────────── */}
      <div className="flex gap-4 flex-1 overflow-x-auto pb-2">
        {COLUMNS.map((col) => {
          const colTasks = tasksByStatus(col.id);
          const colPoints = colTasks.reduce((sum, t) => sum + t.points, 0);
          return (
            <div key={col.id} className="flex-1 min-w-[320px] max-w-[400px]">
              <Column
                col={col} tasks={colTasks} totalPoints={colPoints}
                currentUserId={currentUserId} currentUserRole={currentUserRole}
                onAddClick={handleAddClick} onEdit={handleEdit}
                onDelete={handleDeleteRequest} onDragStart={handleDragStart}
                onDrop={handleDrop} onCardClick={(t) => { if (!t.id.startsWith("tmp-")) setDetailTask(t); }}
                onMove={handleStatusSelect}
                forceExpand={hasFilters}
                footer={col.id === "DONE" && remainingOlder > 0 ? (
                  <button
                    type="button"
                    onClick={loadOlderDone}
                    disabled={loadingOlder}
                    className="w-full py-2 rounded-xl border border-dashed border-emerald-200 text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                  >
                    {loadingOlder ? "Cargando…" : `Cargar anteriores (${remainingOlder})`}
                  </button>
                ) : undefined}
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
        <ConfirmationModal
          isOpen
          title="¿Eliminar tarea?"
          message="Esta acción no se puede deshacer. La tarea se eliminará permanentemente."
          confirmText="Sí, eliminar"
          onConfirm={handleDeleteConfirm}
          onClose={() => setConfirmId(null)}
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
