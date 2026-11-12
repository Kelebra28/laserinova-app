"use client";

import { AlertTriangle, CheckCircle2, Clock, Zap, Users, TrendingUp, Shield, Brain } from "lucide-react";
import type { CalTask, TaskTag, TaskUser, HealthResult, Recommendation } from "./CalendarTypes";
import { STATUS_META, PRIORITY_META } from "./CalendarTypes";
import { UserAvatar } from "@/components/ui/UserAvatar";
import type { WeekMetrics } from "./CalendarEngine";
import { urgencyScore, CAPACITY_STYLE } from "./CalendarEngine";
import { isDatePast, formatDueDate } from "@/lib/dates";

// ─── Health Bar ───────────────────────────────────────────────────────────────

export function HealthBar({ health, metrics }: { health: HealthResult; metrics: WeekMetrics }) {
  const pct = health.score;
  const barColor = pct >= 85 ? "from-emerald-400 to-emerald-600"
    : pct >= 70 ? "from-green-400 to-emerald-500"
    : pct >= 55 ? "from-amber-400 to-yellow-500"
    : pct >= 40 ? "from-orange-400 to-amber-500"
    : "from-red-400 to-rose-600";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
      {/* Top row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Salud Operativa</p>
            <p className={`text-xl font-black ${health.color}`}>{pct}% — {health.label}</p>
          </div>
        </div>
        {/* Metric pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <MetricPill icon={<Clock className="w-3 h-3"/>} value={metrics.total} label="esta semana" color="text-gray-700" bg="bg-gray-100"/>
          <MetricPill icon={<AlertTriangle className="w-3 h-3"/>} value={metrics.overdue} label="vencidas" color={metrics.overdue>0?"text-rose-700":"text-gray-500"} bg={metrics.overdue>0?"bg-rose-50":"bg-gray-100"} border={metrics.overdue>0?"border-rose-200":"border-transparent"}/>
          <MetricPill icon={<Shield className="w-3 h-3"/>} value={metrics.blocked} label="bloqueadas" color={metrics.blocked>0?"text-orange-700":"text-gray-500"} bg={metrics.blocked>0?"bg-orange-50":"bg-gray-100"} border={metrics.blocked>0?"border-orange-200":"border-transparent"}/>
          <MetricPill icon={<Zap className="w-3 h-3"/>} value={metrics.totalHours} label="horas sem." color="text-violet-700" bg="bg-violet-50" border="border-violet-200"/>
          <MetricPill icon={<TrendingUp className="w-3 h-3"/>} value={metrics.highPriority} label="alta prior." color={metrics.highPriority>0?"text-red-700":"text-gray-500"} bg={metrics.highPriority>0?"bg-red-50":"bg-gray-100"} border={metrics.highPriority>0?"border-red-200":"border-transparent"}/>
        </div>
      </div>
      {/* Bar */}
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700`} style={{ width:`${pct}%` }} />
      </div>
      {/* Reasons */}
      <p className="text-[11px] text-gray-500">
        {health.reasons.join(" · ")}
      </p>
    </div>
  );
}

function MetricPill({ icon, value, label, color, bg, border="border-transparent" }: {
  icon: React.ReactNode; value: number; label: string; color: string; bg: string; border?: string;
}) {
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border ${bg} ${border}`}>
      <span className={color}>{icon}</span>
      <span className={`text-sm font-black ${color}`}>{value}</span>
      <span className="text-[10px] text-gray-500 font-medium">{label}</span>
    </div>
  );
}

// ─── Recommendations Panel ────────────────────────────────────────────────────

export function RecommendationsBar({ recs, onRecClick }: { recs: Recommendation[]; onRecClick: (rec: Recommendation) => void }) {
  return (
    <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2.5">
        <Brain className="w-4 h-4 text-indigo-500 animate-pulse" />
        <span className="text-[11px] font-black text-indigo-700 uppercase tracking-widest">Recomendaciones del sistema</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {recs.map((r) => {
          const isAllClear = r.id === "all_clear";
          if (isAllClear) {
            return (
              <span
                key={r.id}
                className="text-[11px] text-indigo-800 bg-white/70 border border-indigo-100 px-3 py-1.5 rounded-xl font-medium"
              >
                {r.text}
              </span>
            );
          }

          return (
            <button
              key={r.id}
              onClick={() => onRecClick(r)}
              className="text-[11px] text-indigo-800 bg-white/75 hover:bg-white border border-indigo-100 px-3 py-1.5 rounded-xl font-medium shadow-sm hover:shadow transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer inline-flex items-center gap-1.5 animate-in fade-in duration-300"
            >
              {r.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Today View ───────────────────────────────────────────────────────────────

export function TodayView({ tasks, todayStr }: { tasks: CalTask[]; todayStr: string }) {
  const now = new Date();
  const todayTasks = tasks.filter(t => t.dueDate?.slice(0,10) === todayStr && t.status !== "DONE");
  const overdue    = tasks.filter(t => t.dueDate && t.status !== "DONE" && isDatePast(t.dueDate));
  const blocked    = tasks.filter(t => t.status === "BLOCKED");
  const sorted     = [...todayTasks].sort((a,b) => urgencyScore(b,now) - urgencyScore(a,now));
  const topTask    = sorted[0];
  const totalHours = todayTasks.reduce((s,t) => s+(t.points||0), 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-red-500" />
      <div className="p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-gray-900">⚡ Hoy en el Taller</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-lg">{totalHours}h programadas</span>
            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-lg">{todayTasks.length} tareas</span>
          </div>
        </div>

        {/* Top task */}
        {topTask && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">🎯 Atacar primero</p>
            <p className="text-sm font-black text-gray-900">{topTask.title}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${STATUS_META[topTask.status].bg} ${STATUS_META[topTask.status].color}`}>
                {STATUS_META[topTask.status].label}
              </span>
              <span className={`text-[10px] font-bold ${PRIORITY_META[topTask.priority].color}`}>
                {PRIORITY_META[topTask.priority].label}
              </span>
              {topTask.points > 0 && <span className="text-[10px] text-violet-600 font-bold">{topTask.points}h</span>}
            </div>
          </div>
        )}

        {/* Alerts row */}
        <div className="grid grid-cols-3 gap-2">
          <AlertCard count={overdue.length} label="Vencidas" color="rose" />
          <AlertCard count={blocked.length} label="Bloqueadas" color="orange" />
          <AlertCard count={todayTasks.filter(t=>t.assignees.length===0).length} label="Sin dueño" color="amber" />
        </div>

        {/* Task list */}
        {sorted.length > 0 && (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cola de hoy</p>
            {sorted.map((t, i) => (
              <div key={t.id} className="flex items-center gap-2 p-2 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-[10px] font-black text-gray-400 w-4 shrink-0">#{i+1}</span>
                <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_META[t.priority].dot}`} />
                <span className="text-xs font-medium text-gray-700 truncate flex-1">{t.title}</span>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${STATUS_META[t.status].bg} ${STATUS_META[t.status].color}`}>
                  {STATUS_META[t.status].label}
                </span>
              </div>
            ))}
          </div>
        )}

        {todayTasks.length === 0 && (
          <p className="text-sm text-gray-400 italic text-center py-4">Sin tareas programadas para hoy</p>
        )}
      </div>
    </div>
  );
}

function AlertCard({ count, label, color }: { count: number; label: string; color: string }) {
  const styles: Record<string, string> = {
    rose:   "bg-rose-50 border-rose-200 text-rose-700",
    orange: "bg-orange-50 border-orange-200 text-orange-700",
    amber:  "bg-amber-50 border-amber-200 text-amber-700",
  };
  return (
    <div className={`border rounded-xl p-2.5 text-center ${count > 0 ? styles[color] : "bg-gray-50 border-gray-100 text-gray-400"}`}>
      <p className="text-xl font-black">{count}</p>
      <p className="text-[10px] font-bold">{label}</p>
    </div>
  );
}

// ─── Task Detail Panel ────────────────────────────────────────────────────────

export function TaskPanel({ task, onClose }: { task: CalTask; onClose: () => void }) {
  const sm = STATUS_META[task.status];
  const pm = PRIORITY_META[task.priority];
  const now = new Date();
  const overdue = task.dueDate && task.status !== "DONE" && isDatePast(task.dueDate);
  const doneSubtasks = task.subtasks.filter(s => s.done).length;

  return (
    <div className="w-72 shrink-0 bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden flex flex-col max-h-[calc(100vh-12rem)]">
      <div className="h-1 bg-gradient-to-r from-red-500 via-rose-500 to-orange-400" />
      <div className="p-3 flex items-start justify-between gap-2 border-b border-gray-100">
        <div className="flex flex-wrap gap-1">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black ${sm.bg} ${sm.color} ${sm.border} border`}>{sm.label}</span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-gray-100 ${pm.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${pm.dot}`}/>{pm.label}
          </span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-lg leading-none shrink-0">×</button>
      </div>

      <div className="p-4 flex flex-col gap-3 overflow-y-auto flex-1 text-xs">
        <h3 className="text-sm font-black text-gray-900 leading-snug">{task.title}</h3>
        {task.description && <p className="text-gray-500 leading-relaxed">{task.description}</p>}

        {task.dueDate && (
          <div className={`flex items-center gap-1.5 font-bold ${overdue ? "text-rose-600" : "text-gray-600"}`}>
            <Clock className="w-3.5 h-3.5 shrink-0" />
            {overdue && "⚠ "}
            {formatDueDate(task.dueDate,{day:"2-digit",month:"long",year:"numeric"})}
          </div>
        )}

        {task.blockerReason && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5">
            <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Bloqueador</p>
            <p className="text-rose-700">{task.blockerReason}</p>
          </div>
        )}

        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.tags.map(tag => (
              <span key={tag.id} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-md border border-gray-200 uppercase tracking-wide">{tag.name}</span>
            ))}
          </div>
        )}

        {task.assignees.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {task.assignees.map(({user}) => (
              <div key={user.id} className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-xl border border-gray-100">
                <UserAvatar name={user.name} size="xs" />
                <span className="text-[11px] font-bold text-gray-700">{user.name.split(" ")[0]}</span>
              </div>
            ))}
          </div>
        )}

        {task.assignees.length === 0 && (
          <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            <Users className="w-3.5 h-3.5"/>
            <span className="font-bold text-[11px]">Sin responsable asignado</span>
          </div>
        )}

        {task.subtasks.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Subtareas</p>
              <span className="font-bold text-gray-500">{doneSubtasks}/{task.subtasks.length}</span>
            </div>
            <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden mb-1.5">
              <div className="h-full bg-emerald-500 rounded-full" style={{width:`${task.subtasks.length>0?(doneSubtasks/task.subtasks.length)*100:0}%`}}/>
            </div>
            <div className="space-y-1">
              {task.subtasks.slice(0,5).map(s => (
                <div key={s.id} className={`flex items-center gap-1.5 ${s.done?"text-gray-400 line-through":"text-gray-600"}`}>
                  <div className={`w-3 h-3 rounded border shrink-0 flex items-center justify-center ${s.done?"bg-emerald-500 border-emerald-500":"border-gray-300"}`}>
                    {s.done && <span className="text-white text-[8px]">✓</span>}
                  </div>
                  {s.title}
                </div>
              ))}
            </div>
          </div>
        )}

        {task.points > 0 && (
          <span className="text-violet-700 bg-violet-50 border border-violet-200 px-2.5 py-1 rounded-xl w-fit font-black">
            {task.points}h estimadas
          </span>
        )}
      </div>
    </div>
  );
}
