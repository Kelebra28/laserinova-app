"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type TaskStatus = "BACKLOG" | "PENDING" | "IN_PROGRESS" | "BLOCKED" | "DONE";
export type TaskPriority = "LOW" | "NORMAL" | "HIGH";

// Helper: include clause shared across queries
const TASK_INCLUDE = {
  assignees: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
  createdBy: { select: { id: true, name: true } },
  subtasks: { orderBy: { order: "asc" as const } },
  tags: true,
} as const;

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
  createdById: string;
  status?: TaskStatus;
}) {
  const maxOrder = await prisma.task.aggregate({
    _max: { order: true },
    where: { status: data.status ?? "PENDING" },
  });

  const newTask = await prisma.task.create({
    data: {
      title: data.title,
      description: data.description ?? null,
      priority: data.priority ?? "NORMAL",
      points: data.points ?? 0,
      progress: 0,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      status: data.status ?? "PENDING",
      order: (maxOrder._max.order ?? -1) + 1,
      createdById: data.createdById,
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
  try {
    await prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id: taskId },
        data: {
          title: data.title,
          description: data.description,
          priority: data.priority,
          points: data.points,
          dueDate: data.dueDate ? new Date(data.dueDate) : data.dueDate === null ? null : undefined,
          blockerReason: data.blockerReason,
          progress: data.progress,
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
  try {
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: newStatus,
        blockerReason: newStatus === "BLOCKED" ? blockerReason ?? null : null,
        // Auto-set progress 100 when DONE
        progress: newStatus === "DONE" ? 100 : undefined,
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
  try {
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: newStatus,
        order: newOrder,
        blockerReason: newStatus === "BLOCKED" ? blockerReason ?? null : null,
        progress: newStatus === "DONE" ? 100 : undefined,
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

// ─── Reorder within same column ──────────────────────────────────────────────

export async function reorderTasksAction(
  items: { id: string; order: number }[]
) {
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
  try {
    await prisma.task.update({
      where: { id: taskId },
      data: { dueDate: newDate ? new Date(newDate) : null },
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
  await prisma.subTask.update({
    where: { id: subTaskId },
    data: { done },
  });
  revalidatePath("/dashboard/tasks");
}

// ─── SubTask: Delete ─────────────────────────────────────────────────────────

export async function deleteSubTaskAction(subTaskId: string) {
  await prisma.subTask.delete({ where: { id: subTaskId } });
  revalidatePath("/dashboard/tasks");
}

// ─── Tags Management ─────────────────────────────────────────────────────────

export async function ensureDefaultTags() {
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
  const newTag = await prisma.taskTag.create({
    data: { name, color },
  });
  revalidatePath("/dashboard/tasks");
  return newTag;
}
