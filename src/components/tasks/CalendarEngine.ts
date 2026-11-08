import type { CalTask, HealthResult, DayCapacity, CapacityLevel, Recommendation } from "./CalendarTypes";
import { toDateStr, MAX_DAILY_HOURS } from "./CalendarTypes";
import { isDatePast } from "@/lib/dates";

// ─── Health Score ──────────────────────────────────────────────────────────────

export function calcHealthScore(tasks: CalTask[]): HealthResult {
  const now = new Date();
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay() + 1);
  const weekEnd   = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);

  const weekTasks = tasks.filter(t => {
    if (!t.dueDate) return false;
    const d = new Date(t.dueDate);
    return d >= weekStart && d <= weekEnd;
  });

  const overdue       = tasks.filter(t => t.dueDate && t.status !== "DONE" && isDatePast(t.dueDate)).length;
  const blocked       = tasks.filter(t => t.status === "BLOCKED").length;
  const noResponsable = tasks.filter(t => t.assignees.length === 0 && t.status !== "DONE").length;
  const highPending   = tasks.filter(t => t.priority === "HIGH" && !["DONE"].includes(t.status)).length;
  const doneThisWeek  = weekTasks.filter(t => t.status === "DONE").length;

  // Check saturated days this week
  const dayHours: Record<string, number> = {};
  tasks.forEach(t => {
    if (!t.dueDate) return;
    const d = new Date(t.dueDate);
    if (d >= weekStart && d <= weekEnd) {
      const key = toDateStr(d);
      dayHours[key] = (dayHours[key] || 0) + (t.points || 0);
    }
  });
  const saturatedDays = Object.values(dayHours).filter(h => h > MAX_DAILY_HOURS * 1.2).length;

  let score = 100;
  score -= overdue       * 8;
  score -= blocked       * 5;
  score -= saturatedDays * 4;
  score -= noResponsable * 3;
  score -= highPending   * 2;
  score += doneThisWeek  * 1;
  score  = Math.max(0, Math.min(100, Math.round(score)));

  const reasons: string[] = [];
  if (overdue > 0)       reasons.push(`${overdue} tarea${overdue>1?"s":""} vencida${overdue>1?"s":""}`);
  if (blocked > 0)       reasons.push(`${blocked} tarea${blocked>1?"s":""} bloqueada${blocked>1?"s":""}`);
  if (saturatedDays > 0) reasons.push(`${saturatedDays} día${saturatedDays>1?"s":""} saturado${saturatedDays>1?"s":""}`);
  if (noResponsable > 0) reasons.push(`${noResponsable} sin responsable`);
  if (highPending > 0)   reasons.push(`${highPending} alta prioridad pendiente${highPending>1?"s":""}`);
  if (reasons.length === 0) reasons.push("Todo en orden esta semana");

  let label = "Excelente";
  let color = "text-emerald-600";
  if (score < 85) { label = "Bien";      color = "text-green-600"; }
  if (score < 70) { label = "Atención";  color = "text-amber-600"; }
  if (score < 55) { label = "Riesgo";    color = "text-orange-600"; }
  if (score < 40) { label = "Crítico";   color = "text-red-600"; }

  return { score, label, color, reasons };
}

// ─── Daily Capacity ────────────────────────────────────────────────────────────

export function calcDayCapacity(tasks: CalTask[], dateStr: string): DayCapacity {
  const hours = tasks
    .filter(t => t.dueDate?.slice(0,10) === dateStr)
    .reduce((sum, t) => sum + (t.points || 0), 0);

  let level: CapacityLevel = "light";
  if (hours >= 4) level = "normal";
  if (hours >= 7) level = "loaded";
  if (hours >= MAX_DAILY_HOURS * 1.2) level = "saturated";

  return { hours, level };
}

export const CAPACITY_STYLE: Record<CapacityLevel, { bg: string; label: string; badge: string }> = {
  light:     { bg: "bg-white",         label: "Ligero",    badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  normal:    { bg: "bg-white",         label: "Normal",    badge: "bg-blue-50 text-blue-700 border-blue-200"           },
  loaded:    { bg: "bg-amber-50/60",   label: "Cargado",   badge: "bg-amber-50 text-amber-700 border-amber-200"        },
  saturated: { bg: "bg-rose-50/50",    label: "Saturado",  badge: "bg-rose-50 text-rose-700 border-rose-200"           },
};

// ─── Urgency Score ─────────────────────────────────────────────────────────────

export function urgencyScore(task: CalTask, now: Date): number {
  if (!task.dueDate) return 0;
  let s = 0;
  const due = new Date(task.dueDate);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / 86400000);
  if (diffDays < 0)  s += 40;
  if (diffDays === 0) s += 30;
  if (diffDays === 1) s += 15;
  if (task.priority === "HIGH")    s += 20;
  if (task.priority === "NORMAL")  s += 8;
  if (task.status === "BLOCKED")   s -= 10;
  if (task.assignees.length === 0) s += 5;
  s += (task.points || 0) * 2;
  return s;
}

// ─── Recommendations ──────────────────────────────────────────────────────────

export function generateRecommendations(tasks: CalTask[]): Recommendation[] {
  const now    = new Date();
  const todayStr = toDateStr(now);
  const recs: Recommendation[] = [];

  const overdue = tasks.filter(t => t.dueDate && t.status !== "DONE" && isDatePast(t.dueDate));
  if (overdue.length > 0) {
    recs.push({
      id: "overdue",
      text: `⚡ Tienes ${overdue.length} tarea${overdue.length>1?"s":""} vencida${overdue.length>1?"s":""} — atácalas primero`,
      type: "overdue",
      metadata: { count: overdue.length }
    });
  }

  const blocked = tasks.filter(t => t.status === "BLOCKED");
  if (blocked.length > 0) {
    recs.push({
      id: "blocked",
      text: `🔴 ${blocked.length} tarea${blocked.length>1?"s están":"  está"} bloqueada${blocked.length>1?"s":""} — revisa qué las frena`,
      type: "blocked",
      metadata: { count: blocked.length }
    });
  }

  const noOwner = tasks.filter(t => t.assignees.length === 0 && t.status !== "DONE");
  if (noOwner.length > 0) {
    recs.push({
      id: "no_owner",
      text: `👤 ${noOwner.length} tarea${noOwner.length>1?"s":""} sin responsable — asígnalas para no perder control`,
      type: "no_owner",
      metadata: { count: noOwner.length }
    });
  }

  const dayHours: Record<string, number> = {};
  tasks.forEach(t => {
    if (!t.dueDate) return;
    const key = t.dueDate.slice(0,10);
    dayHours[key] = (dayHours[key]||0) + (t.points||0);
  });
  const saturated = Object.entries(dayHours).filter(([,h]) => h > MAX_DAILY_HOURS * 1.2);
  if (saturated.length > 0) {
    const [day] = saturated[0];
    const d = new Date(day+"T12:00:00");
    recs.push({
      id: `saturated-${day}`,
      text: `📦 ${d.toLocaleDateString("es-MX",{weekday:"long",day:"numeric",month:"short"})} está saturado — mueve tareas a días libres`,
      type: "saturated",
      metadata: { date: day }
    });
  }

  const todayTasks = tasks.filter(t => t.dueDate?.slice(0,10) === todayStr && t.status !== "DONE");
  if (todayTasks.length > 0) {
    recs.push({
      id: "today",
      text: `🎯 Hoy tienes ${todayTasks.length} tarea${todayTasks.length>1?"s":""} por cerrar`,
      type: "today",
      metadata: { count: todayTasks.length }
    });
  }

  const highPending = tasks.filter(t => t.priority === "HIGH" && !["DONE","BLOCKED"].includes(t.status));
  if (highPending.length > 0) {
    recs.push({
      id: "high_priority",
      text: `🔥 ${highPending.length} tarea${highPending.length>1?"s de":"  de"} alta prioridad sin terminar`,
      type: "high_priority",
      metadata: { count: highPending.length }
    });
  }

  if (recs.length === 0) {
    recs.push({
      id: "all_clear",
      text: "✅ Todo bien — sin alertas críticas esta semana",
      type: "today"
    });
  }

  return recs.slice(0, 4);
}

// ─── Week metrics ──────────────────────────────────────────────────────────────

export interface WeekMetrics {
  total: number;
  overdue: number;
  blocked: number;
  totalHours: number;
  doneThisWeek: number;
  highPriority: number;
}

export function calcWeekMetrics(tasks: CalTask[]): WeekMetrics {
  const now = new Date();
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay() + 1);
  const weekEnd   = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);

  const week = tasks.filter(t => {
    if (!t.dueDate) return false;
    const d = new Date(t.dueDate);
    return d >= weekStart && d <= weekEnd;
  });

  return {
    total:        week.length,
    overdue:      tasks.filter(t => t.dueDate && t.status !== "DONE" && isDatePast(t.dueDate)).length,
    blocked:      tasks.filter(t => t.status === "BLOCKED").length,
    totalHours:   week.reduce((s,t) => s + (t.points||0), 0),
    doneThisWeek: week.filter(t => t.status === "DONE").length,
    highPriority: tasks.filter(t => t.priority === "HIGH" && t.status !== "DONE").length,
  };
}
