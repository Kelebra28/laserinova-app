"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function getUsers() {
  await requireAuth(); 
  
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        permissions: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: users };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createUser(data: { name: string; email: string; password?: string; role: string }) {
  const session = await requireAuth();
  if (session.role !== "ADMIN") return { success: false, error: "No autorizado" };

  try {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) return { success: false, error: "El correo ya está registrado" };

    const passwordHash = await bcrypt.hash(data.password || "123456", 10);
    
    // By default, new sellers have all permissions enabled, they can be turned off later
    const defaultPermissions = {
      dashboard: true, chats: true, agent: true, email: true, quotes: true,
      receipts: true, tasks: true, clients: true, providers: true,
      payment_requests: true, finance: false, inventory: true, materials: true,
      processes: true, labels: true, surveys: false, reports: true,
    };

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
        permissions: defaultPermissions,
      },
    });

    return { success: true, data: user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateUser(id: string, data: { name?: string; role?: string; permissions?: any; active?: boolean }) {
  const session = await requireAuth();
  if (session.role !== "ADMIN") return { success: false, error: "No autorizado" };

  try {
    const user = await prisma.user.update({
      where: { id },
      data,
    });
    return { success: true, data: user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
