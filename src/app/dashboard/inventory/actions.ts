"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getInventoryData() {
  const categories = await prisma.productCategory.findMany({
    orderBy: { name: 'asc' },
    include: { products: { orderBy: { name: 'asc' } } }
  });
  return categories;
}

export async function createProductCategory(formData: FormData) {
  const name = formData.get("name") as string;
  if (!name) return { error: "El nombre es requerido" };
  
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  
  try {
    await prisma.productCategory.create({
      data: { name, slug }
    });
    revalidatePath("/dashboard/inventory");
    return { success: true };
  } catch (error) {
    return { error: "Error al crear la categoría" };
  }
}

export async function createProduct(formData: FormData) {
  const categoryId = formData.get("categoryId") as string;
  const name = formData.get("name") as string;
  const model = formData.get("model") as string || null;
  const color = formData.get("color") as string || null;
  const brand = formData.get("brand") as string || null;
  const stockQuantity = Number(formData.get("stockQuantity")) || 0;
  const unitCost = Number(formData.get("unitCost")) || 0;
  const unitPrice = Number(formData.get("unitPrice")) || 0;
  
  if (!categoryId || !name) return { error: "Categoría y nombre son requeridos" };
  
  try {
    await prisma.product.create({
      data: {
        categoryId,
        name,
        model,
        brand,
        color,
        stockQuantity,
        unitCost,
        unitPrice
      }
    });
    revalidatePath("/dashboard/inventory");
    return { success: true };
  } catch (error) {
    return { error: "Error al crear producto" };
  }
}

export async function updateProductStock(productId: string, newStock: number) {
  try {
    await prisma.product.update({
      where: { id: productId },
      data: { stockQuantity: newStock }
    });
    revalidatePath("/dashboard/inventory");
    return { success: true };
  } catch (error) {
    return { error: "Error al actualizar stock" };
  }
}

export async function deleteProduct(productId: string) {
  try {
    await prisma.product.delete({
      where: { id: productId }
    });
    revalidatePath("/dashboard/inventory");
    return { success: true };
  } catch (error) {
    return { error: "Error al eliminar producto" };
  }
}
