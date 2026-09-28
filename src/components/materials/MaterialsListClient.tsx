"use client";

import { useState, useMemo } from "react";
import SearchInput from "@/components/ui/SearchInput";
import { MaterialRow } from "@/components/materials/MaterialRow";
import Link from "next/link";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Material {
  id: string;
  name: string;
  brand: string | null;
  family: string | null;
  color: string | null;
  categoryId: string;
  category: Category;
  width: number;
  height: number;
  cost: number;
  margin: number;
  price: number;
}

interface MaterialsListClientProps {
  initialMaterials: Material[];
  categories: Category[];
  currentCategorySlug: string;
}

const categoryColors = [
  "bg-blue-100 text-blue-800",
  "bg-purple-100 text-purple-800",
  "bg-indigo-100 text-indigo-800",
  "bg-pink-100 text-pink-800",
  "bg-teal-100 text-teal-800",
  "bg-cyan-100 text-cyan-800",
  "bg-orange-100 text-orange-800",
  "bg-fuchsia-100 text-fuchsia-800",
  "bg-sky-100 text-sky-800",
  "bg-violet-100 text-violet-800",
];

function getCategoryColor(categoryName: string) {
  let hash = 0;
  for (let i = 0; i < categoryName.length; i++) {
    hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % categoryColors.length;
  return categoryColors[index];
}

export default function MaterialsListClient({ 
  initialMaterials, 
  categories, 
  currentCategorySlug
}: MaterialsListClientProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredMaterials = useMemo(() => {
    let filtered = initialMaterials;

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(m => 
        (m.name && m.name.toLowerCase().includes(lower)) ||
        (m.brand && m.brand.toLowerCase().includes(lower)) ||
        (m.family && m.family.toLowerCase().includes(lower)) ||
        (m.color && m.color.toLowerCase().includes(lower))
      );
    }

    return filtered;
  }, [initialMaterials, searchTerm]);

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md border border-gray-100">
      <div className="px-4 py-4 sm:px-6 border-b border-gray-200">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          {/* Buscador */}
          <SearchInput 
            placeholder="Buscar material..." 
            value={searchTerm}
            onChange={setSearchTerm}
          />
          
          {/* Filtros */}
          <div className="w-full md:w-2/3 flex gap-2 overflow-x-auto pb-2 scrollbar-hide items-center">
            <Link
              href="/dashboard/materials"
              className={`shrink-0 inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                currentCategorySlug === "all"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Todos
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/dashboard/materials?category=${cat.slug}`}
                className={`shrink-0 inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  currentCategorySlug === cat.slug
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Material
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Categoría
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Medidas
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Precio (Hoja / cm²)
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredMaterials.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No hay materiales registrados o que coincidan con la búsqueda.
                </td>
              </tr>
            ) : (
              filteredMaterials.map((material) => (
                <MaterialRow 
                  key={material.id} 
                  material={material as any} 
                  categories={categories}
                  categoryColor={getCategoryColor(material.category.name)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
