"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { toDateOnlyISO } from "@/lib/dates";
import { TASK_INCLUDE, doneSince, olderDoneWhere, serializeTask } from "@/lib/tasks";

export type TaskStatus = "BACKLOG" | "PENDING" | "IN_PROGRESS" | "BLOCKED" | "DONE";
export type TaskPriority = "LOW" | "NORMAL" | "HIGH";

// ─── Auth / permisos ─────────────────────────────────────────────────────────

type SessionUser = { id: string; role: string; name?: string };

async function requireUser(): Promise<SessionUser> {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  if (!user?.id) throw new Error("No autorizado");
  return user;
}

/** Editar o eliminar una tarea: solo ADMIN o quien la creó (mismo criterio que la interfaz). */
async function requireCanModify(taskId: string, user: SessionUser) {
  if (user.role === "ADMIN") return;
  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { createdById: true } });
  if (!task) return; // la acción responde "no encontrada"
  if (task.createdById !== user.id) {
    throw new Error("No tienes permiso para modificar esta tarea");
  }
}

/** Progreso coherente al cambiar de columna. */
function progressAfterMove(prevStatus: string, prevProgress: number, next: TaskStatus): number | undefined {
  if (next === "DONE") return 100;
  if (next === "BACKLOG" || next === "PENDING") return 0;
  if (prevStatus === "DONE" && prevProgress >= 100) return 90; // reabierta: no puede seguir al 100 %
  return undefined;
}

/** completedAt: se fija al entrar a DONE (si ya estaba, se conserva) y se limpia al salir. */
function completedAtAfterMove(prevStatus: string, next: TaskStatus): Date | null | undefined {
  if (next === "DONE") return prevStatus === "DONE" ? undefined : new Date();
  return null;
}

async function currentProgressState(taskId: string) {
  return prisma.task.findUnique({ where: { id: taskId }, select: { status: true, progress: true } });
}

// ─── Create ─────────────────────────────────────────────────────────────────

export async function createTaskAction(data: {
  title: string;
  description?: string;
  priority?: TaskPriority;
  points?: number;
  dueDate?: string;
  assigneeIds?: string[];
  subtasks?: string[];
  tagIds?: string[];
  /** Se ignora: el creador siempre es el usuario de la sesión. */
  createdById?: string;
  status?: TaskStatus;
}) {
  const user = await requireUser();
  const title = data.title?.trim();
  if (!title) throw new Error("El título es obligatorio");

  const maxOrder = await prisma.task.aggregate({
    _max: { order: true },
    where: { status: data.status ?? "PENDING" },
  });

  const newTask = await prisma.task.create({
    data: {
      title,
      description: data.description ?? null,
      priority: data.priority ?? "NORMAL",
      points: Math.max(0, data.points ?? 0),
      progress: 0,
      dueDate: toDateOnlyISO(data.dueDate) ? new Date(toDateOnlyISO(data.dueDate)!) : null,
      status: data.status ?? "PENDING",
      completedAt: data.status === "DONE" ? new Date() : null,
      order: (maxOrder._max.order ?? -1) + 1,
      createdById: user.id,
      assignees: data.assigneeIds?.length
        ? { create: data.assigneeIds.map((userId) => ({ userId })) }
        : undefined,
      subtasks: data.subtasks?.length
        ? { create: data.subtasks.map((title, i) => ({ title, order: i, done: false })) }
        : undefined,
      tags: data.tagIds?.length
        ? { connect: data.tagIds.map(id => ({ id })) }
        : undefined,
    },
    include: TASK_INCLUDE,
  });

  revalidatePath("/dashboard/tasks");
  return {
    ...newTask,
    status: newTask.status as TaskStatus,
    priority: newTask.priority as TaskPriority,
    dueDate: newTask.dueDate?.toISOString() ?? null,
    createdAt: newTask.createdAt.toISOString(),
    updatedAt: newTask.updatedAt.toISOString(),
    subtasks: newTask.subtasks.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() })),
  };
}

// ─── Update (full edit) ──────────────────────────────────────────────────────

export async function updateTaskAction(
  taskId: string,
  data: {
    title?: string;
    description?: string;
    priority?: TaskPriority;
    points?: number;
    dueDate?: string | null;
    blockerReason?: string | null;
    progress?: number;
    assigneeIds?: string[];
    subtasksToCreate?: string[];
    subtasksToDelete?: string[];
    tagIds?: string[];
  }
) {
  const user = await requireUser();
  await requireCanModify(taskId, user);
  const dueISO = toDateOnlyISO(data.dueDate);
  try {
    await prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id: taskId },
        data: {
          title: data.title?.trim() || undefined,
          description: data.description,
          priority: data.priority,
          points: data.points === undefined ? undefined : Math.max(0, data.points),
          dueDate: dueISO ? new Date(dueISO) : data.dueDate === null ? null : undefined,
          blockerReason: data.blockerReason,
          progress: data.progress === undefined ? undefined : Math.max(0, Math.min(100, data.progress)),
          tags: data.tagIds ? { set: data.tagIds.map(id => ({ id })) } : undefined,
        },
      });

      if (data.assigneeIds !== undefined) {
        await tx.taskAssignee.deleteMany({ where: { taskId } });
        if (data.assigneeIds.length > 0) {
          await tx.taskAssignee.createMany({
            data: data.assigneeIds.map((userId) => ({ taskId, userId })),
          });
        }
      }

      if (data.subtasksToDelete && data.subtasksToDelete.length > 0) {
        await tx.subTask.deleteMany({
          where: { id: { in: data.subtasksToDelete } },
        });
      }

      if (data.subtasksToCreate && data.subtasksToCreate.length > 0) {
        const maxOrder = await tx.subTask.aggregate({
          _max: { order: true },
          where: { taskId },
        });
        let nextOrder = (maxOrder._max.order ?? -1) + 1;
        
        await tx.subTask.createMany({
          data: data.subtasksToCreate.map((title) => ({
            taskId,
            title,
            done: false,
            order: nextOrder++,
          })),
        });
      }
    }, {
      timeout: 20000,
    });
  } catch (error: any) {
    if (error?.code === "P2025" || error?.message?.includes("Record to update not found")) {
      console.warn(`Task ${taskId} not found for updateTaskAction`);
      return { success: false, error: "Task not found" };
    }
    throw error;
  }

  revalidatePath("/dashboard/tasks");
}

// ─── Update progress only ────────────────────────────────────────────────────

export async function updateTaskProgressAction(taskId: string, progress: number) {
  await requireUser();
  try {
    await prisma.task.update({
      where: { id: taskId },
      data: { progress: Math.max(0, Math.min(100, progress)) },
    });
  } catch (error: any) {
    if (error?.code === "P2025" || error?.message?.includes("Record to update not found")) {
      console.warn(`Task ${taskId} not found for updateTaskProgressAction`);
      return { success: false, error: "Task not found" };
    }
    throw error;
  }
  revalidatePath("/dashboard/tasks");
}

// ─── Quick status change (from card or detail modal) ─────────────────────────

export async function updateTaskStatusAction(
  taskId: string,
  newStatus: TaskStatus,
  blockerReason?: string
) {
  await requireUser();
  if (newStatus === "BLOCKED" && !blockerReason?.trim()) throw new Error("Indica el motivo del bloqueo");
  try {
    const prev = await currentProgressState(taskId);
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: newStatus,
        blockerReason: newStatus === "BLOCKED" ? blockerReason?.trim() ?? null : null,
        progress: prev ? progressAfterMove(prev.status, prev.progress ?? 0, newStatus) : undefined,
        completedAt: prev ? completedAtAfterMove(prev.status, newStatus) : undefined,
      },
    });
  } catch (error: any) {
    if (error?.code === "P2025" || error?.message?.includes("Record to update not found")) {
      console.warn(`Task ${taskId} not found for updateTaskStatusAction`);
      return { success: false, error: "Task not found" };
    }
    throw error;
  }

  revalidatePath("/dashboard/tasks");
}

// ─── Move (drag & drop) ───────────────────────────────────────────────────────

export async function moveTaskAction(
  taskId: string,
  newStatus: TaskStatus,
  newOrder: number,
  blockerReason?: string
) {
  await requireUser();
  if (newStatus === "BLOCKED" && !blockerReason?.trim()) throw new Error("Indica el motivo del bloqueo");
  try {
    const prev = await currentProgressState(taskId);
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: newStatus,
        order: newOrder,
        blockerReason: newStatus === "BLOCKED" ? blockerReason?.trim() ?? null : null,
        progress: prev ? progressAfterMove(prev.status, prev.progress ?? 0, newStatus) : undefined,
        completedAt: prev ? completedAtAfterMove(prev.status, newStatus) : undefined,
      },
    });
  } catch (error: any) {
    if (error?.code === "P2025" || error?.message?.includes("Record to update not found")) {
      console.warn(`Task ${taskId} not found for moveTaskAction`);
      return { success: false, error: "Task not found" };
    }
    throw error;
  }

  revalidatePath("/dashboard/tasks");
}

// ─── Move + reorder en una sola llamada (drag & drop) ─────────────────────────

export async function moveAndReorderTasksAction(
  taskId: string,
  newStatus: TaskStatus,
  blockerReason: string | undefined,
  /** Solo las tareas de la columna destino cuyo orden cambió (incluida la movida). */
  items: { id: string; order: number }[]
) {
  await requireUser();
  if (newStatus === "BLOCKED" && !blockerReason?.trim()) throw new Error("Indica el motivo del bloqueo");
  const movedOrder = items.find((i) => i.id === taskId)?.order;
  try {
    const prev = await currentProgressState(taskId);
    if (!prev) return { success: false, error: "Task not found" };
    await prisma.$transaction([
      prisma.task.update({
        where: { id: taskId },
        data: {
          status: newStatus,
          order: movedOrder,
          blockerReason: newStatus === "BLOCKED" ? blockerReason?.trim() ?? null : null,
          progress: progressAfterMove(prev.status, prev.progress ?? 0, newStatus),
          completedAt: completedAtAfterMove(prev.status, newStatus),
        },
      }),
      ...items
        .filter((i) => i.id !== taskId)
        .map((i) => prisma.task.update({ where: { id: i.id }, data: { order: i.order } })),
    ]);
  } catch (error: any) {
    if (error?.code === "P2025") return { success: false, error: "Task not found" };
    throw error;
  }
  revalidatePath("/dashboard/tasks");
  return { success: true };
}

// ─── Terminadas anteriores (bajo demanda) ─────────────────────────────────────

export async function getOlderDoneTasksAction(skip: number, take: number = 30) {
  await requireUser();
  const rows = await prisma.task.findMany({
    where: olderDoneWhere(doneSince()),
    orderBy: [{ completedAt: "desc" }, { updatedAt: "desc" }],
    include: TASK_INCLUDE,
    skip: Math.max(0, skip),
    take: Math.min(Math.max(1, take), 100),
  });
  return rows.map(serializeTask);
}

// ─── Reorder within same column ──────────────────────────────────────────────

export async function reorderTasksAction(
  items: { id: string; order: number }[]
) {
  await requireUser();
  try {
    await prisma.$transaction(
      items.map((item) =>
        prisma.task.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      )
    );
  } catch (error: any) {
    if (error?.code === "P2025" || error?.message?.includes("Record to update not found")) {
      console.warn("Some tasks were not found during reorderTasksAction");
      return { success: false, error: "Some tasks were not found" };
    }
    throw error;
  }
  revalidatePath("/dashboard/tasks");
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export async function deleteTaskAction(taskId: string) {
  const user = await requireUser();
  await requireCanModify(taskId, user);
  try {
    await prisma.task.delete({ where: { id: taskId } });
  } catch (error: any) {
    if (error?.code === "P2025" || error?.message?.includes("Record to delete not found")) {
      console.warn(`Task ${taskId} not found for deleteTaskAction`);
      return { success: false, error: "Task not found" };
    }
    throw error;
  }
  revalidatePath("/dashboard/tasks");
}

// ─── Update due date (calendar drag) ──────────────────────────────────────────

export async function updateTaskDueDateAction(taskId: string, newDate: string | null) {
  await requireUser();
  const iso = toDateOnlyISO(newDate);
  try {
    await prisma.task.update({
      where: { id: taskId },
      data: { dueDate: iso ? new Date(iso) : null },
    });
  } catch (error: any) {
    if (error?.code === "P2025" || error?.message?.includes("Record to update not found")) {
      console.warn(`Task ${taskId} not found for updateTaskDueDateAction`);
      return { success: false, error: "Task not found" };
    }
    throw error;
  }
  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard/tasks/calendar");
}

// ─── SubTask: Create ─────────────────────────────────────────────────────────

export async function createSubTaskAction(taskId: string, title: string) {
  await requireUser();
  const maxOrder = await prisma.subTask.aggregate({
    _max: { order: true },
    where: { taskId },
  });

  const sub = await prisma.subTask.create({
    data: {
      taskId,
      title: title.trim(),
      done: false,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  revalidatePath("/dashboard/tasks");
  return { ...sub, createdAt: sub.createdAt.toISOString() };
}

// ─── SubTask: Toggle done ────────────────────────────────────────────────────

export async function toggleSubTaskAction(subTaskId: string, done: boolean) {
  await requireUser();
  await prisma.subTask.update({
    where: { id: subTaskId },
    data: { done },
  });
  revalidatePath("/dashboard/tasks");
}

// ─── SubTask: Delete ─────────────────────────────────────────────────────────

export async function deleteSubTaskAction(subTaskId: string) {
  await requireUser();
  await prisma.subTask.delete({ where: { id: subTaskId } });
  revalidatePath("/dashboard/tasks");
}

// ─── Tags Management ─────────────────────────────────────────────────────────

export async function ensureDefaultTags() {
  await requireUser();
  const defaultTags = [
    { name: "Cotización", color: "blue" },
    { name: "Corte", color: "red" },
    { name: "Grabado", color: "orange" },
    { name: "Envío", color: "emerald" },
    { name: "Diseño", color: "violet" },
    { name: "Producción", color: "amber" },
    { name: "Administrativo", color: "gray" },
  ];

  for (const tag of defaultTags) {
    await prisma.taskTag.upsert({
      where: { name: tag.name },
      update: {},
      create: tag,
    });
  }

  return await prisma.taskTag.findMany({ orderBy: { name: 'asc' } });
}

export async function createTaskTag(name: string, color: string = "gray") {
  await requireUser();
  const cleanName = name.trim();
  if (!cleanName) throw new Error("El nombre de la categoría es obligatorio");
  const newTag = await prisma.taskTag.create({
    data: { name: cleanName, color },
  });
  revalidatePath("/dashboard/tasks");
  return newTag;
}
