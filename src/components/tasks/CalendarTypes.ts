import type { TaskStatus, TaskPriority } from "@/app/dashboard/tasks/actions";
export type { TaskStatus, TaskPriority };

export interface TaskUser { id: string; name: string; email: string; role: string; }
export interface TaskTag  { id: string; name: string; color: string; }
export interface SubTask  { id: string; title: string; done: boolean; order: number; createdAt: string; }

export interface CalTask {
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

export interface HealthResult {
  score: number;
  label: string;
  color: string;
  reasons: string[];
}

export interface Recommendation {
  id: string;
  text: string;
  type: "overdue" | "blocked" | "no_owner" | "saturated" | "today" | "high_priority";
  metadata?: {
    date?: string;
    count?: number;
  };
}

export type CapacityLevel = "light" | "normal" | "loaded" | "saturated";

export interface DayCapacity {
  hours: number;
  level: CapacityLevel;
}

export const STATUS_META: Record<TaskStatus, { label: string; color: string; bg: string; dot: string; border: string }> = {
  BACKLOG:     { label: "Por Hacer",  color: "text-slate-700",   bg: "bg-slate-100",   dot: "bg-slate-400",   border: "border-slate-200"  },
  PENDING:     { label: "Pendiente",  color: "text-amber-700",   bg: "bg-amber-50",    dot: "bg-amber-400",   border: "border-amber-200"  },
  IN_PROGRESS: { label: "En Proceso", color: "text-blue-700",    bg: "bg-blue-50",     dot: "bg-blue-500",    border: "border-blue-200"   },
  BLOCKED:     { label: "Bloqueado",  color: "text-rose-700",    bg: "bg-rose-50",     dot: "bg-rose-500",    border: "border-rose-200"   },
  DONE:        { label: "Terminado",  color: "text-emerald-700", bg: "bg-emerald-50",  dot: "bg-emerald-500", border: "border-emerald-200" },
};

export const PRIORITY_META: Record<TaskPriority, { label: string; dot: string; color: string }> = {
  HIGH:   { label: "Alta",   dot: "bg-red-500",    color: "text-red-600"   },
  NORMAL: { label: "Normal", dot: "bg-amber-400",  color: "text-amber-600" },
  LOW:    { label: "Baja",   dot: "bg-slate-300",  color: "text-slate-500" },
};

export const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
export const DAYS_OF_WEEK = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
export const MAX_DAILY_HOURS = 8;

export function toDateStr(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}
