import { prisma } from "@/lib/prisma";
import { ProductsClient } from "./ProductsClient";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Catálogo de Productos | Laser Inova",
};

interface Props {
  searchParams: Promise<{ provider?: string; q?: string }>;
}

export default async function ProductsPage({ searchParams }: Props) {
  const { provider = "Doble Vela", q = "" } = await searchParams;

  const products = await prisma.product.findMany({
    where: {
      provider: provider,
      name: { contains: q },
      active: true,
    },
    include: {
      category: true,
    },
    orderBy: { name: "asc" },
  });

  // Obtener conteo real global de categorías para este proveedor
  const categoryCountsData = await prisma.product.groupBy({
    by: ['categoryId'],
    where: { provider: provider, active: true },
    _count: { id: true }
  });

  const allCats = await prisma.productCategory.findMany();

  const globalCategories = allCats
    .map(cat => ({
      name: cat.name,
      count: categoryCountsData.find(c => c.categoryId === cat.id)?._count.id || 0
    }))
    .filter(cat => cat.count > 0)
    .sort((a, b) => b.count - a.count)
    .map(cat => cat.name);

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-zinc-900">
            Catálogo de Productos
          </h2>
          <p className="text-zinc-500 font-medium">
            Consulta el inventario de distribuidores para cotizar y recomendar a clientes.
          </p>
        </div>
      </div>
      
      {/* Pasamos los datos limpios al componente de cliente */}
      <ProductsClient 
        initialProducts={products} 
        currentProvider={provider} 
        currentSearch={q} 
        globalCategories={globalCategories}
      />
    </div>
  );
}
