export const dynamic = 'force-dynamic';
import { createCategory } from "../actions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewCategoryPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center space-x-4">
        <Link
          href="/dashboard/materials/categories"
          className="p-2 -ml-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Nueva Categoría</h1>
      </div>

      <form action={createCategory} className="bg-white shadow-sm border border-gray-100 rounded-lg p-6 space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Nombre de la Categoría *
          </label>
          <div className="mt-1">
            <input
              type="text"
              name="name"
              id="name"
              required
              className="shadow-sm focus:ring-red-500 focus:border-red-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 border px-3"
              placeholder="Ej: MDF, Acrílico, etc."
            />
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200 flex justify-end space-x-3">
          <Link
            href="/dashboard/materials/categories"
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Guardar Categoría
          </button>
        </div>
      </form>
    </div>
  );
}
