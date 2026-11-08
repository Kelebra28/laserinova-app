export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TaskBoard } from "@/components/tasks/TaskBoard";
import { TASK_INCLUDE, boardTasksWhere, doneSince, olderDoneWhere, serializeTask } from "@/lib/tasks";

export const metadata = {
  title: "Tareas — Laser Inova CRM",
  description: "Tablero de tareas estilo Jira con drag & drop, puntos, prioridad y subtareas",
};

const PRIORITY_ORDER: Record<string, number> = { HIGH: 0, NORMAL: 1, LOW: 2 };

export default async function TasksPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const currentUser = session.user as { id: string; role: string; name: string };

  const since = doneSince();

  const [tasks, olderDoneCount, users, tags] = await Promise.all([
    prisma.task.findMany({
      // Terminadas: solo las recientes. Las anteriores se cargan bajo demanda desde el tablero.
      where: boardTasksWhere(since),
      orderBy: [{ status: "asc" }, { order: "asc" }],
      include: TASK_INCLUDE,
    }),
    prisma.task.count({ where: olderDoneWhere(since) }),
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
    .map(serializeTask)
    // Sort by priority (HIGH first) then by order within each column
    .sort((a, b) => {
      if (a.status !== b.status) return 0;
      const pd = (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1);
      return pd !== 0 ? pd : a.order - b.order;
    });

  return (
    <TaskBoard
      initialTasks={serializedTasks}
      olderDoneCount={olderDoneCount}
      users={users}
      tags={finalTags}
      currentUserId={currentUser.id}
      currentUserRole={currentUser.role}
    />
  );
}
