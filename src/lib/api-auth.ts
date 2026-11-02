import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

/**
 * Guard para route handlers. Devuelve una respuesta 401/403 si no hay sesión
 * (o no es ADMIN cuando se pide), o null si se puede continuar.
 *
 *   const denied = await guardApi();          // cualquier usuario autenticado
 *   const denied = await guardApi("ADMIN");   // solo administradores
 *   if (denied) return denied;
 */
export async function guardApi(role?: "ADMIN"): Promise<NextResponse | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (role === "ADMIN" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  return null;
}
