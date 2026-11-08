import type { Prisma } from "@prisma/client";

/** Relaciones que acompañan a una tarea en el tablero y el calendario. */
export const TASK_INCLUDE = {
  assignees: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
  createdBy: { select: { id: true, name: true } },
  subtasks: { orderBy: { order: "asc" as const } },
  tags: true,
} as const;

/** El tablero solo carga las tareas terminadas en esta ventana; las anteriores se piden bajo demanda. */
export const DONE_WINDOW_DAYS = 30;

export function doneSince(days: number = DONE_WINDOW_DAYS): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/** Tareas visibles en el tablero: todas las abiertas + las terminadas desde `since`. */
export function boardTasksWhere(since: Date): Prisma.TaskWhereInput {
  return {
    OR: [
      { status: { not: "DONE" } },
      { completedAt: { gte: since } },
      { completedAt: null, updatedAt: { gte: since } }, // terminadas sin fecha registrada
    ],
  };
}

/** Terminadas anteriores a `since` (las que se cargan bajo demanda). */
export function olderDoneWhere(since: Date): Prisma.TaskWhereInput {
  return {
    status: "DONE",
    OR: [{ completedAt: { lt: since } }, { completedAt: null, updatedAt: { lt: since } }],
  };
}

type TaskWithRelations = Prisma.TaskGetPayload<{ include: typeof TASK_INCLUDE }>;

export type TaskStatusValue = "BACKLOG" | "PENDING" | "IN_PROGRESS" | "BLOCKED" | "DONE";
export type TaskPriorityValue = "LOW" | "NORMAL" | "HIGH";

/** Convierte una tarea de Prisma en un objeto serializable para el cliente. */
export function serializeTask(t: TaskWithRelations) {
  return {
    ...t,
    status: t.status as TaskStatusValue,
    priority: t.priority as TaskPriorityValue,
    progress: t.progress ?? 0,
    blockerReason: t.blockerReason ?? null,
    dueDate: t.dueDate?.toISOString() ?? null,
    completedAt: t.completedAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    assignees: t.assignees.map((a) => ({ user: a.user })),
    subtasks: t.subtasks.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() })),
    tags: t.tags || [],
  };
}
