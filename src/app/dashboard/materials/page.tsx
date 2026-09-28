import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { MaterialRow } from "@/components/materials/MaterialRow";
import { Plus, Tag, Edit, Trash2 } from "lucide-react";
import { deleteMaterial } from "./actions";
import MaterialsListClient from "@/components/materials/MaterialsListClient";



export default async function MaterialsPage(props: { 
  searchParams?: Promise<{ category?: string; search?: string }> 
}) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const currentCategory = searchParams.category || "all";

  const categories = await prisma.materialCategory.findMany({
    orderBy: { name: "asc" },
  });

  const materials = await prisma.material.findMany({
    where: {
      ...(currentCategory !== "all" ? { category: { slug: currentCategory } } : {})
    },
    include: {
      category: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Materiales</h1>
        <div className="flex gap-2">
          <Link
            href="/dashboard/materials/categories"
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 shadow-sm"
          >
            <Tag className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            Categorías
          </Link>
          <Link
            href="/dashboard/materials/new"
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            Nuevo Material
          </Link>
        </div>
      </div>

      <MaterialsListClient 
        initialMaterials={materials as any} 
        categories={categories} 
        currentCategorySlug={currentCategory} 
      />
    </div>
  );
}
