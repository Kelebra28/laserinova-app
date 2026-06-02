"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createClient(formData: FormData) {
  const name = formData.get("name")?.toString();
  const company = formData.get("company")?.toString();
  const email = formData.get("email")?.toString();
  const phone = formData.get("phone")?.toString();
  const rfc = formData.get("rfc")?.toString();
  const address = formData.get("address")?.toString();
  const notes = formData.get("notes")?.toString();

  if (!name) {
    throw new Error("El nombre es requerido");
  }

  await prisma.client.create({
    data: {
      name,
      company: company || null,
      email: email || null,
      phone: phone || null,
      rfc: rfc || null,
      address: address || null,
      notes: notes || null,
    },
  });

  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/clients");
}

export async function updateClient(id: string, formData: FormData) {
  const name = formData.get("name")?.toString();
  const company = formData.get("company")?.toString();
  const email = formData.get("email")?.toString();
  const phone = formData.get("phone")?.toString();
  const rfc = formData.get("rfc")?.toString();
  const address = formData.get("address")?.toString();
  const notes = formData.get("notes")?.toString();

  if (!name) {
    throw new Error("El nombre es requerido");
  }

  await prisma.client.update({
    where: { id },
    data: {
      name,
      company: company || null,
      email: email || null,
      phone: phone || null,
      rfc: rfc || null,
      address: address || null,
      notes: notes || null,
    },
  });

  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/clients");
}

export async function deleteClient(id: string) {
  try {
    // Verificar si tiene cotizaciones
    const quotesCount = await prisma.quote.count({
      where: { clientId: id },
    });

    if (quotesCount > 0) {
      // Borrado lógico si tiene historial para mantener integridad
      await prisma.client.update({
        where: { id },
        data: { active: false },
      });
    } else {
      // Borrado físico si no tiene nada asociado
      await prisma.client.delete({
        where: { id },
      });
    }

    revalidatePath("/dashboard", "layout");
    return { success: true };
  } catch (error) {
    console.error("Error deleting client:", error);
    return { error: "No se pudo eliminar el cliente" };
  }
}
