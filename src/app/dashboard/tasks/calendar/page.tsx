export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TaskCalendar } from "@/components/tasks/TaskCalendar";
import { TASK_INCLUDE, boardTasksWhere, doneSince, serializeTask } from "@/lib/tasks";

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
      // Terminadas: solo los últimos 90 días; el calendario no necesita todo el historial
      where: boardTasksWhere(doneSince(90)),
      orderBy: [{ dueDate: "asc" }, { order: "asc" }],
      include: TASK_INCLUDE,
    }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true, email: true, role: true }, orderBy: { name: "asc" } }),
    prisma.taskTag.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <TaskCalendar
      initialTasks={allTasks.map(serializeTask)}
      users={users}
      tags={tags}
      currentUserId={currentUser.id}
      currentUserRole={currentUser.role}
    />
  );
}
