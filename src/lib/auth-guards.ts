import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { FINANCE_ALLOWED_ROLES } from "@/constants/finance.constants";

/**
 * Protección por rol del módulo de Finanzas (solo ADMIN, igual que en el middleware).
 *
 * El middleware solo cubre las PÁGINAS. Las acciones del servidor se pueden invocar por su cuenta, sin pasar
 * por la página, así que cada acción de Finanzas debe llamar `requireAdminUser()` ella misma.
 *   - Acciones:  const user = await requireAdminUser();   // lanza "No autorizado"
 *   - Páginas:   await requireAdminPage();                // redirige al login o al dashboard
 */

export type SessionUser = { id: string; role: string; name?: string | null };

/** Decide si una sesión puede usar Finanzas. Pura (sin red): devuelve el usuario o lanza "No autorizado". */
export function assertAdminSession(session: unknown): SessionUser {
  const user = (session as { user?: Partial<SessionUser> } | null | undefined)?.user;
  if (!user?.id || !user.role || !FINANCE_ALLOWED_ROLES.includes(user.role)) throw new Error("No autorizado");
  return user as SessionUser;
}

export async function requireAdminUser(): Promise<SessionUser> {
  return assertAdminSession(await getServerSession(authOptions));
}

export async function requireAdminPage(): Promise<SessionUser> {
  const user = (await getServerSession(authOptions))?.user as Partial<SessionUser> | undefined;
  if (!user?.id) redirect("/login");
  if (!user.role || !FINANCE_ALLOWED_ROLES.includes(user.role)) redirect("/dashboard");
  return user as SessionUser;
}
