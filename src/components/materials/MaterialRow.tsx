"use client";

import { useState } from "react";
import { Edit, Trash2, Check, X } from "lucide-react";
import { updateMaterial, deleteMaterial } from "@/app/dashboard/materials/actions";
import { formatCurrency } from "@/lib/constants";

export function MaterialRow({ material, categories, categoryColor }: { material: any, categories: any[], categoryColor: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDelete = async () => {
    const formData = new FormData();
    formData.append("id", material.id);
    await deleteMaterial(formData);
    setIsDeleting(false);
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append("id", material.id);
    await updateMaterial(formData);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <tr className="bg-white border-y-2 border-red-100 shadow-sm relative">
        <td className="px-6 py-4 align-top">
          <div className="flex flex-col gap-2 w-full max-w-xs">
            <input 
              type="text" 
              name="name" 
              form={`edit-form-${material.id}`}
              defaultValue={material.name} 
              required 
              className="block w-full text-sm border-gray-300 rounded-md py-1.5 px-2 border focus:ring-red-500 focus:border-red-500" 
              placeholder="Nombre"
            />
            <div className="flex gap-2">
              <input 
                type="text" 
                name="brand" 
                form={`edit-form-${material.id}`}
                defaultValue={material.brand || ""} 
                className="block w-full text-xs border-gray-300 rounded-md py-1.5 px-2 border focus:ring-red-500 focus:border-red-500" 
                placeholder="Marca"
              />
              <input 
                type="text" 
                name="color" 
                form={`edit-form-${material.id}`}
                defaultValue={material.color || ""} 
                className="block w-full text-xs border-gray-300 rounded-md py-1.5 px-2 border focus:ring-red-500 focus:border-red-500" 
                placeholder="Color"
              />
            </div>
          </div>
        </td>
        
        <td className="px-6 py-4 align-top">
          <select 
            name="categoryId" 
            form={`edit-form-${material.id}`}
            defaultValue={material.categoryId} 
            required 
            className="block w-full text-sm border-gray-300 rounded-md py-1.5 px-2 border bg-white focus:ring-red-500 focus:border-red-500"
          >
            {categories.map((cat: any) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </td>

        <td className="px-6 py-4 align-top">
          <div className="flex gap-2 items-center">
            <div className="flex flex-col w-16">
              <label className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Largo</label>
              <input type="number" step="0.01" name="length" form={`edit-form-${material.id}`} defaultValue={material.length || ""} className="block w-full text-sm border-gray-300 rounded-md py-1.5 px-2 border focus:ring-red-500 focus:border-red-500" placeholder="cm" />
            </div>
            <span className="text-gray-400 mt-4">x</span>
            <div className="flex flex-col w-16">
              <label className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Ancho</label>
              <input type="number" step="0.01" name="width" form={`edit-form-${material.id}`} defaultValue={material.width || ""} className="block w-full text-sm border-gray-300 rounded-md py-1.5 px-2 border focus:ring-red-500 focus:border-red-500" placeholder="cm" />
            </div>
            <div className="flex flex-col w-20 ml-2">
              <label className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Grosor</label>
              <input type="number" step="0.01" name="thickness" form={`edit-form-${material.id}`} defaultValue={material.thickness || ""} className="block w-full text-sm border-gray-300 rounded-md py-1.5 px-2 border focus:ring-red-500 focus:border-red-500" placeholder="mm" />
            </div>
          </div>
        </td>

        <td className="px-6 py-4 align-top">
          <div className="flex flex-col w-32">
            <label className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Costo Hoja</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input type="number" step="0.01" name="sheetPrice" form={`edit-form-${material.id}`} defaultValue={material.sheetPrice || ""} className="block w-full pl-6 text-sm border-gray-300 rounded-md py-1.5 px-2 border focus:ring-red-500 focus:border-red-500" placeholder="0.00" />
            </div>
          </div>
        </td>

        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium align-middle">
          <form id={`edit-form-${material.id}`} onSubmit={handleUpdate} className="flex justify-end space-x-2">
            <button type="submit" className="text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 p-2 rounded-md transition-colors border border-green-200" title="Guardar">
              <Check className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => setIsEditing(false)} className="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 p-2 rounded-md transition-colors border border-red-200" title="Cancelar">
              <X className="h-5 w-5" />
            </button>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900">{material.name}</span>
          <span className="text-sm text-gray-500">
            {[material.brand, material.color].filter(Boolean).join(" - ")}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${categoryColor}`}>
          {material.category.name}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {material.length && material.width ? `${material.length}x${material.width}cm` : "-"}
        {material.thickness ? ` (${material.thickness}mm)` : ""}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
        <div>{formatCurrency(material.sheetPrice)}</div>
        <div className="text-xs text-gray-500 font-normal">${(material.pricePerCm2 || 0).toLocaleString("es-MX", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}/cm²</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex justify-end space-x-2">
          <button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-blue-600 transition-colors" title="Editar material">
            <Edit className="h-5 w-5" />
          </button>
          <button onClick={() => setIsDeleting(true)} className="text-gray-400 hover:text-red-600 transition-colors" title="Eliminar material">
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </td>

      {/* Delete Confirmation Modal */}
      {isDeleting && (
        <td colSpan={0}>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900 bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Eliminar Material</h3>
              <p className="text-sm text-gray-500 mb-6">
                ¿Estás seguro de que deseas eliminar <strong>{material.name}</strong>? Esta acción no se puede deshacer.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsDeleting(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        </td>
      )}
    </tr>
  );
}
