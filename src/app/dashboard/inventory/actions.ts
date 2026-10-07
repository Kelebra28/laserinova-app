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
  const image = formData.get("image") as string || null;
  
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
        unitPrice,
        image
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

export async function validateProductsImport(rows: any[]) {
  try {
    // Buscar todas las categorías existentes
    const existingCategories = await prisma.productCategory.findMany();
    const existingProducts = await prisma.product.findMany();

    const newProducts = [];
    const conflicts = [];
    const invalidRows = [];

    for (const row of rows) {
      if (!row.nombre || !row.categoria) {
        invalidRows.push(row);
        continue;
      }

      // Buscar si el producto ya existe (por modelo si existe, si no por nombre)
      const existingProduct = existingProducts.find(p => 
        (row.modelo && p.model?.toLowerCase() === row.modelo.toLowerCase()) || 
        p.name.toLowerCase() === row.nombre.toLowerCase()
      );

      // Buscar o preparar la categoría
      let category = existingCategories.find(c => c.name.toLowerCase() === row.categoria.toLowerCase());
      const categoryId = category ? category.id : `NEW_${row.categoria}`; // ID temporal si es nueva

      const parsedProduct = {
        name: row.nombre,
        model: row.modelo || null,
        brand: row.marca || null,
        provider: row.proveedor || null,
        color: row.color || null,
        stockQuantity: Number(row.stock) || 0,
        unitCost: Number(row.costo) || 0,
        unitPrice: Number(row.precio_venta) || 0,
        notes: row.notas || null,
        image: row.imagen_url || null,
        categoryId: categoryId,
        categoryName: row.categoria, // para crearla si no existe
      };

      if (existingProduct) {
        conflicts.push({
          existing: existingProduct,
          incoming: parsedProduct
        });
      } else {
        newProducts.push(parsedProduct);
      }
    }

    return { success: true, newProducts, conflicts, invalidRows };
  } catch (error) {
    console.error(error);
    return { error: "Error al validar el CSV" };
  }
}

export async function executeProductsImport(newProducts: any[], updateProducts: any[]) {
  try {
    // 1. Crear categorías faltantes
    const allCategoryNames = new Set([
      ...newProducts.map(p => p.categoryName),
      ...updateProducts.map(p => p.incoming.categoryName)
    ]);

    const existingCategories = await prisma.productCategory.findMany();
    const existingCatNames = new Set(existingCategories.map(c => c.name.toLowerCase()));

    const categoriesToCreate = Array.from(allCategoryNames).filter(
      name => !existingCatNames.has(name.toLowerCase())
    );

    for (const catName of categoriesToCreate) {
      const slug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const newCat = await prisma.productCategory.create({
        data: { name: catName, slug }
      });
      existingCategories.push(newCat);
    }

    // Función auxiliar para obtener categoryId
    const getCatId = (name: string) => {
      return existingCategories.find(c => c.name.toLowerCase() === name.toLowerCase())?.id || "";
    };

    // 2. Insertar nuevos productos
    if (newProducts.length > 0) {
      await prisma.product.createMany({
        data: newProducts.map(p => ({
          name: p.name,
          model: p.model,
          brand: p.brand,
          provider: p.provider,
          color: p.color,
          stockQuantity: p.stockQuantity,
          unitCost: p.unitCost,
          unitPrice: p.unitPrice,
          notes: p.notes,
          image: p.image,
          categoryId: getCatId(p.categoryName)
        }))
      });
    }

    // 3. Actualizar productos conflictivos
    for (const conflict of updateProducts) {
      const p = conflict.incoming;
      await prisma.product.update({
        where: { id: conflict.existing.id },
        data: {
          name: p.name,
          model: p.model,
          brand: p.brand,
          provider: p.provider,
          color: p.color,
          stockQuantity: p.stockQuantity,
          unitCost: p.unitCost,
          unitPrice: p.unitPrice,
          notes: p.notes,
          image: p.image,
          categoryId: getCatId(p.categoryName)
        }
      });
    }

    revalidatePath("/dashboard/inventory");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Error al importar productos" };
  }
}

