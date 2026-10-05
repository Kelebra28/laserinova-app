import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TaskCalendar } from "@/components/tasks/TaskCalendar";

export const metadata = {
  title: "Calendario Operativo — Laser Inova CRM",
  description: "Panel de control operativo del taller con inteligencia de producción",
};

export default async function TaskCalendarPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const currentUser = session.user as { id: string; role: string; name: string };

  const [allTasks, users, tags] = await Promise.all([
    prisma.task.findMany({
      orderBy: [{ dueDate: "asc" }, { order: "asc" }],
      include: {
        assignees: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
        createdBy: { select: { id: true, name: true } },
        subtasks: { orderBy: { order: "asc" } },
        tags: true,
      },
    }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true, email: true, role: true }, orderBy: { name: "asc" } }),
    prisma.taskTag.findMany({ orderBy: { name: "asc" } }),
  ]);

  const serialize = (t: typeof allTasks[0]) => ({
    ...t,
    status: t.status as "BACKLOG" | "PENDING" | "IN_PROGRESS" | "BLOCKED" | "DONE",
    priority: t.priority as "LOW" | "NORMAL" | "HIGH",
    progress: t.progress ?? 0,
    blockerReason: t.blockerReason ?? null,
    dueDate: t.dueDate?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    assignees: t.assignees.map((a) => ({ user: a.user })),
    subtasks: t.subtasks.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() })),
    tags: t.tags || [],
  });

  return (
    <TaskCalendar
      initialTasks={allTasks.map(serialize)}
      users={users}
      tags={tags}
      currentUserId={currentUser.id}
      currentUserRole={currentUser.role}
    />
  );
}
