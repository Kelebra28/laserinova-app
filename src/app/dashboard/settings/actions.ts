"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { encrypt } from "@/lib/encryption";

// ─── Cost configs ─────────────────────────────────────────────────────────────

export async function updateCostConfigurations(formData: FormData) {
  const entries = Array.from(formData.entries());
  const configEntries = entries.filter(([key]) => key !== "submit");

  for (const [key, value] of configEntries) {
    if (!value) continue;
    const parsedValue = parseFloat(value as string);
    if (isNaN(parsedValue)) continue;
    const name = key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    await prisma.costConfiguration.upsert({
      where: { key },
      update: { value: parsedValue },
      create: { key, name, value: parsedValue },
    });
  }
  revalidatePath("/dashboard/settings");
}

// ─── Create user ──────────────────────────────────────────────────────────────

export async function createUserAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") throw new Error("No autorizado");

  const name     = (formData.get("name") as string).trim();
  const email    = (formData.get("email") as string).trim().toLowerCase();
  const password = formData.get("password") as string;
  const role     = (formData.get("role") as string) || "SELLER";

  if (!name || !email || !password) throw new Error("Faltan campos requeridos");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("Ya existe un usuario con ese correo");

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({ data: { name, email, passwordHash, role } });

  revalidatePath("/dashboard/settings");
}

// ─── Update user (admin editing any user) ────────────────────────────────────

export async function updateUserAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") throw new Error("No autorizado");

  const userId = formData.get("userId") as string;
  const name   = (formData.get("name") as string).trim();
  const email  = (formData.get("email") as string).trim().toLowerCase();
  const role   = formData.get("role") as string;
  const active = formData.get("active") === "true";

  const data: any = { name, email, role, active };

  const newPassword = (formData.get("newPassword") as string)?.trim();
  if (newPassword && newPassword.length >= 6) {
    data.passwordHash = await bcrypt.hash(newPassword, 10);
  }

  await prisma.user.update({ where: { id: userId }, data });
  revalidatePath("/dashboard/settings");
}

// ─── Update own profile ───────────────────────────────────────────────────────

export async function updateProfileAction(formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    const currentUserId = (session?.user as any)?.id;
    if (!currentUserId) return { success: false, error: "No autenticado" };

    const name  = (formData.get("name") as string).trim();
    const email = (formData.get("email") as string).trim().toLowerCase();

    const data: any = { name, email };

    const currentPassword = (formData.get("currentPassword") as string)?.trim();
    const newPassword     = (formData.get("newPassword") as string)?.trim();

    if (currentPassword && newPassword) {
      const user = await prisma.user.findUnique({ where: { id: currentUserId } });
      if (!user) return { success: false, error: "Usuario no encontrado" };

      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) return { success: false, error: "La contraseña actual es incorrecta" };
      if (newPassword.length < 6) return { success: false, error: "La nueva contraseña debe tener al menos 6 caracteres" };

      data.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    await prisma.user.update({ where: { id: currentUserId }, data });
    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error: any) {
    console.error("Error in updateProfileAction:", error);
    return { success: false, error: error.message || "Error al actualizar el perfil" };
  }
}

// ─── Toggle user active ───────────────────────────────────────────────────────

export async function toggleUserActiveAction(userId: string, active: boolean) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") throw new Error("No autorizado");

  await prisma.user.update({ where: { id: userId }, data: { active } });
  revalidatePath("/dashboard/settings");
}

// ─── Update own email credentials ─────────────────────────────────────────────

export async function updateUserEmailConfigAction(formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    const currentUserId = (session?.user as any)?.id;
    if (!currentUserId) return { success: false, error: "No autenticado" };

    const emailPassword = (formData.get("emailPassword") as string)?.trim();
    const imapServer = (formData.get("imapServer") as string)?.trim() || "imap.hostinger.com";
    const smtpServer = (formData.get("smtpServer") as string)?.trim() || "smtp.hostinger.com";

    const data: any = {
      emailIncomingServer: imapServer,
      emailOutgoingServer: smtpServer,
    };

    if (emailPassword) {
      data.emailPasswordEncrypted = encrypt(emailPassword);
    }

    await prisma.user.update({
      where: { id: currentUserId },
      data,
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error: any) {
    console.error("Error in updateUserEmailConfigAction:", error);
    return { success: false, error: error.message || "Error al actualizar la configuración de correo" };
  }
}
