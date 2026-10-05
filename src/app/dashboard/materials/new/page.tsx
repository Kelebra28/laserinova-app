export const dynamic = 'force-dynamic';
import { createMaterial } from "../actions";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function NewMaterialPage() {
  const categories = await prisma.materialCategory.findMany({
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
        <h1 className="text-2xl font-bold text-gray-900">Nuevo Material</h1>
      </div>

      {categories.length === 0 ? (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Aún no has registrado ninguna categoría.{" "}
                <Link href="/dashboard/materials/categories/new" className="font-medium underline text-yellow-700 hover:text-yellow-600">
                  Crea una categoría primero
                </Link>{" "}
                antes de agregar un material.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <form action={createMaterial} className="bg-white shadow-sm border border-gray-100 rounded-lg p-6 space-y-8">
          <div className="space-y-6 border-b border-gray-200 pb-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Información General</h3>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
              <div>
                <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700">
                  Categoría *
                </label>
                <select
                  id="categoryId"
                  name="categoryId"
                  required
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm rounded-md border shadow-sm bg-white"
                >
                  <option value="">Selecciona una categoría...</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Nombre del Material *
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  required
                  className="mt-1 shadow-sm focus:ring-red-500 focus:border-red-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                />
              </div>

              <div>
                <label htmlFor="brand" className="block text-sm font-medium text-gray-700">
                  Marca
                </label>
                <input
                  type="text"
                  name="brand"
                  id="brand"
                  className="mt-1 shadow-sm focus:ring-red-500 focus:border-red-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                />
              </div>

              <div>
                <label htmlFor="family" className="block text-sm font-medium text-gray-700">
                  Familia
                </label>
                <input
                  type="text"
                  name="family"
                  id="family"
                  className="mt-1 shadow-sm focus:ring-red-500 focus:border-red-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                />
              </div>

              <div>
                <label htmlFor="color" className="block text-sm font-medium text-gray-700">
                  Color
                </label>
                <input
                  type="text"
                  name="color"
                  id="color"
                  className="mt-1 shadow-sm focus:ring-red-500 focus:border-red-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                />
              </div>
            </div>
          </div>

          <div className="space-y-6 border-b border-gray-200 pb-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Medidas</h3>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-3">
              <div>
                <label htmlFor="thickness" className="block text-sm font-medium text-gray-700">
                  Grosor (mm)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="thickness"
                  id="thickness"
                  className="mt-1 shadow-sm focus:ring-red-500 focus:border-red-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                />
              </div>
              
              <div>
                <label htmlFor="length" className="block text-sm font-medium text-gray-700">
                  Largo (cm)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="length"
                  id="length"
                  className="mt-1 shadow-sm focus:ring-red-500 focus:border-red-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                />
              </div>

              <div>
                <label htmlFor="width" className="block text-sm font-medium text-gray-700">
                  Ancho (cm)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="width"
                  id="width"
                  className="mt-1 shadow-sm focus:ring-red-500 focus:border-red-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                />
              </div>
            </div>
          </div>

          <div className="space-y-6 border-b border-gray-200 pb-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Costos y Precios</h3>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
              <div>
                <label htmlFor="sheetPrice" className="block text-sm font-medium text-gray-700">
                  Precio de la Hoja ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="sheetPrice"
                  id="sheetPrice"
                  className="mt-1 shadow-sm focus:ring-red-500 focus:border-red-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                />
              </div>

              <div>
                <label htmlFor="guardPercentage" className="block text-sm font-medium text-gray-700">
                  Factor de Guarda (Ej: 1.2)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="guardPercentage"
                  id="guardPercentage"
                  defaultValue="1.2"
                  className="mt-1 shadow-sm focus:ring-red-500 focus:border-red-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                />
              </div>

              <div>
                <label htmlFor="productionPrice" className="block text-sm font-medium text-gray-700">
                  Precio Producción Hoja ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="productionPrice"
                  id="productionPrice"
                  className="mt-1 shadow-sm focus:ring-red-500 focus:border-red-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                />
              </div>

              <div>
                <label htmlFor="pricePerCm2" className="block text-sm font-medium text-gray-700">
                  Precio por cm² ($)
                </label>
                <input
                  type="number"
                  step="0.000001"
                  name="pricePerCm2"
                  id="pricePerCm2"
                  className="mt-1 shadow-sm focus:ring-red-500 focus:border-red-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                  placeholder="Ej: 0.1234"
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                Observaciones / Notas
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                className="mt-1 shadow-sm focus:ring-red-500 focus:border-red-500 block w-full sm:text-sm border border-gray-300 rounded-md py-2 px-3"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end space-x-3">
            <Link
              href="/dashboard/materials"
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Guardar Material
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
