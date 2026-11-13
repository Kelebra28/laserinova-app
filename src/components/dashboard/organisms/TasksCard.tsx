import Panel from "../atoms/Panel";
import ProgressBar from "../atoms/ProgressBar";
import ActionLink from "../atoms/ActionLink";
import { EmptyState } from "../atoms/EmptyState";
import { DASHBOARD_TASKS_SHOWN } from "@/constants/dashboard.constants";
import { formatDueDate, isDatePast } from "@/lib/dates";
import type { DashboardStats } from "@/types/dashboard";

type Props = { tasks: DashboardStats["activeTasks"]; open: number };

/** Las tareas más próximas a vencer. El avance solo se dibuja cuando ya hay avance. */
export default function TasksCard({ tasks, open }: Props) {
  const shown = tasks.slice(0, DASHBOARD_TASKS_SHOWN);
  return (
    <Panel title="Tareas del equipo" subtitle={`${open} abiertas · las más próximas a vencer`} className="h-full">
      {shown.length === 0 ? (
        <EmptyState text="No hay tareas en curso" />
      ) : (
        <ul className="divide-y divide-gray-100">
          {shown.map((t) => {
            const overdue = isDatePast(t.dueDate);
            const running = t.status === "IN_PROGRESS";
            return (
              <li key={t.id} className="py-2.5 first:pt-0">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{t.title}</p>
                  {t.dueDate && (
                    <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold ${overdue ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500"}`}>
                      {formatDueDate(t.dueDate, { day: "numeric", month: "short" })}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500">
                  <span className={`h-1.5 w-1.5 rounded-full ${running ? "bg-gray-900" : "bg-gray-300"}`} />
                  {running ? "En curso" : "Pendiente"}
                  {running && t.progress > 0 && (
                    <>
                      <ProgressBar value={t.progress} color="bg-gray-900" height="h-1" className="flex-1" />
                      {t.progress}%
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <ActionLink href="/dashboard/tasks" className="mt-auto pt-4">
        Ver todas las tareas →
      </ActionLink>
    </Panel>
  );
}
