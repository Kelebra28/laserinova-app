"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { encrypt, decrypt } from "@/lib/encryption";

/** Obtiene el ID del usuario autenticado o lanza un error. */
async function getSessionUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  const id = (session?.user as any)?.id as string | undefined;
  if (!id) throw new Error("No autenticado");
  return id;
}

export interface ProviderContactInput {
  name: string;
  phone?: string;
  email?: string;
}

export interface ProviderInput {
  companyName: string;
  address?: string;
  website?: string;
  portalUsername?: string;
  portalPassword?: string;
  contacts: ProviderContactInput[];
}

/** Obtiene todos los proveedores activos con sus contactos. */
export async function getProvidersAction() {
  await getSessionUserId(); // Verificar sesión
  return await prisma.provider.findMany({
    where: { active: true },
    include: {
      contacts: true,
    },
    orderBy: {
      companyName: "asc",
    },
  });
}

/** Crea un nuevo proveedor y sus contactos relacionados. */
export async function createProviderAction(data: ProviderInput) {
  const userId = await getSessionUserId();

  let portalPasswordEncrypted: string | null = null;
  if (data.portalPassword && data.portalPassword.trim() !== "") {
    portalPasswordEncrypted = encrypt(data.portalPassword.trim());
  }

  const provider = await prisma.provider.create({
    data: {
      companyName: data.companyName.trim(),
      address: data.address?.trim() || null,
      website: data.website?.trim() || null,
      portalUsername: data.portalUsername?.trim() || null,
      portalPasswordEncrypted,
      userId,
      contacts: {
        create: data.contacts.map((c) => ({
          name: c.name.trim(),
          phone: c.phone?.trim() || null,
          email: c.email?.trim() || null,
        })),
      },
    },
    include: {
      contacts: true,
    },
  });

  revalidatePath("/dashboard/providers");
  return { success: true, provider };
}

/** Actualiza un proveedor existente y sincroniza sus contactos. */
export async function updateProviderAction(id: string, data: ProviderInput) {
  const userId = await getSessionUserId();

  const existingProvider = await prisma.provider.findUnique({
    where: { id },
  });

  if (!existingProvider) {
    throw new Error("Proveedor no encontrado");
  }

  let portalPasswordEncrypted = existingProvider.portalPasswordEncrypted;
  if (data.portalPassword !== undefined) {
    if (data.portalPassword === "") {
      portalPasswordEncrypted = null;
    } else {
      // Encriptar solo si se proporciona una nueva contraseña
      portalPasswordEncrypted = encrypt(data.portalPassword.trim());
    }
  }

  const provider = await prisma.provider.update({
    where: { id },
    data: {
      companyName: data.companyName.trim(),
      address: data.address?.trim() || null,
      website: data.website?.trim() || null,
      portalUsername: data.portalUsername?.trim() || null,
      portalPasswordEncrypted,
      contacts: {
        deleteMany: {},
        create: data.contacts.map((c) => ({
          name: c.name.trim(),
          phone: c.phone?.trim() || null,
          email: c.email?.trim() || null,
        })),
      },
    },
    include: {
      contacts: true,
    },
  });

  revalidatePath("/dashboard/providers");
  return { success: true, provider };
}

/** Desactiva (soft-delete) un proveedor de forma segura. */
export async function deleteProviderAction(id: string) {
  await getSessionUserId();

  await prisma.provider.update({
    where: { id },
    data: { active: false },
  });

  revalidatePath("/dashboard/providers");
  return { success: true };
}

/** Desencripta de forma segura una credencial cifrada. */
export async function decryptPasswordAction(encryptedPassword: string) {
  await getSessionUserId(); // Verificar sesión
  try {
    return { success: true, decrypted: decrypt(encryptedPassword) };
  } catch (error) {
    return { success: false, error: "Error al desencriptar la credencial" };
  }
}
