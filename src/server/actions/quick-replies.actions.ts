"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { validateQuickReply, type QuickReply, type QuickReplyInput } from "@/lib/quick-replies";

type Result<T> = { success: true; data: T } | { success: false; error: string };

const SELECT = { id: true, shortcut: true, title: true, content: true } as const;

function failure(e: unknown, fallback: string): { success: false; error: string } {
  const code = (e as { code?: string } | null)?.code;
  if (code === "P2002") return { success: false, error: "Ya existe una respuesta rápida con ese atajo." };
  // P2021 = la tabla no existe todavía (falta correr prisma/migrations/manual_quick_replies.sql)
  if (code === "P2021") return { success: false, error: "Falta crear la tabla de respuestas rápidas en la base de datos." };
  console.error(fallback, e);
  return { success: false, error: fallback };
}

export async function listQuickRepliesAction(): Promise<Result<QuickReply[]>> {
  await requireAuth();
  try {
    return { success: true, data: await prisma.quickReply.findMany({ orderBy: { shortcut: "asc" }, select: SELECT }) };
  } catch (e) {
    return failure(e, "No se pudieron cargar las respuestas rápidas.");
  }
}

export async function createQuickReplyAction(input: QuickReplyInput): Promise<Result<QuickReply>> {
  await requireAuth();
  const v = validateQuickReply(input);
  if ("error" in v) return { success: false, error: v.error };
  try {
    return { success: true, data: await prisma.quickReply.create({ data: v.data, select: SELECT }) };
  } catch (e) {
    return failure(e, "No se pudo guardar la respuesta rápida.");
  }
}

export async function updateQuickReplyAction(id: string, input: QuickReplyInput): Promise<Result<QuickReply>> {
  await requireAuth();
  const v = validateQuickReply(input);
  if ("error" in v) return { success: false, error: v.error };
  try {
    return { success: true, data: await prisma.quickReply.update({ where: { id }, data: v.data, select: SELECT }) };
  } catch (e) {
    return failure(e, "No se pudo actualizar la respuesta rápida.");
  }
}

export async function deleteQuickReplyAction(id: string): Promise<Result<null>> {
  await requireAuth();
  try {
    await prisma.quickReply.delete({ where: { id } });
    return { success: true, data: null };
  } catch (e) {
    return failure(e, "No se pudo eliminar la respuesta rápida.");
  }
}
