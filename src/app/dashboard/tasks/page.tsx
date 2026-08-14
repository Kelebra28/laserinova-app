import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { TaskBoard } from "@/components/tasks/TaskBoard";

export const metadata = {
  title: "Tareas — Laser Inova CRM",
  description: "Tablero de tareas estilo Jira con drag & drop, puntos, prioridad y subtareas",
};

const PRIORITY_ORDER: Record<string, number> = { HIGH: 0, NORMAL: 1, LOW: 2 };

export default async function TasksPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const currentUser = session.user as { id: string; role: string; name: string };

  const [tasks, users, tags] = await Promise.all([
    prisma.task.findMany({
      orderBy: [{ status: "asc" }, { order: "asc" }],
      include: {
        assignees: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
        createdBy: { select: { id: true, name: true } },
        subtasks: { orderBy: { order: "asc" } },
        tags: true,
      },
    }),
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    }),
    prisma.taskTag.findMany({ orderBy: { name: 'asc' } })
  ]);

  let finalTags = tags;
  if (finalTags.length === 0) {
    const { ensureDefaultTags } = await import('./actions');
    finalTags = await ensureDefaultTags();
  }

  const serializedTasks = tasks
    .map((t) => ({
      ...t,
      status: t.status as "BACKLOG" | "PENDING" | "IN_PROGRESS" | "BLOCKED" | "DONE",
      priority: t.priority as "LOW" | "NORMAL" | "HIGH",
      points: t.points,
      progress: t.progress ?? 0,
      blockerReason: t.blockerReason ?? null,
      dueDate: t.dueDate?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      assignees: t.assignees.map((a) => ({ user: a.user })),
      subtasks: t.subtasks.map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
      })),
      tags: t.tags || [],
    }))
    // Sort by priority (HIGH first) then by order within each column
    .sort((a, b) => {
      if (a.status !== b.status) return 0;
      const pd = (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1);
      return pd !== 0 ? pd : a.order - b.order;
    });

  return (
    <TaskBoard
      initialTasks={serializedTasks}
      users={users}
      tags={finalTags}
      currentUserId={currentUser.id}
      currentUserRole={currentUser.role}
    />
  );
}
