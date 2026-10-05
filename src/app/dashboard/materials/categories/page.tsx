export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import CategoryActions from "@/components/materials/CategoryActions";

export default async function CategoriesPage() {
  const categories = await prisma.materialCategory.findMany({
    include: {
      _count: {
        select: { materials: true }
      }
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center space-x-4">
        <Link
          href="/dashboard/materials"
          className="p-2 -ml-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Categorías de Materiales</h1>
      </div>

      <div className="flex justify-end">
        <Link
          href="/dashboard/materials/categories/new"
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
          Nueva Categoría
        </Link>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md border border-gray-100">
        <ul role="list" className="divide-y divide-gray-200">
          {categories.length === 0 ? (
            <li className="px-4 py-8 text-center text-gray-500">
              No hay categorías registradas.
            </li>
          ) : (
            categories.map((category) => (
              <li key={category.id}>
                <div className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {category.name}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {category._count.materials} materiales
                    </p>
                  </div>
                  <CategoryActions categoryId={category.id} categoryName={category.name} />
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
