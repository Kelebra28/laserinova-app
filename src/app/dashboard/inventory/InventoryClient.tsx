"use client";

import { useState, useRef } from "react";
import { Plus, Save, Trash2, Edit2, Check, X, Box, Settings2, PackagePlus } from "lucide-react";
import { createProductCategory, createProduct, updateProductStock, deleteProduct } from "./actions";

export default function InventoryClient({ initialCategories, autoDeductInitial }: { initialCategories: any[], autoDeductInitial: boolean }) {
  const [categories, setCategories] = useState(initialCategories);
  const [autoDeduct, setAutoDeduct] = useState(autoDeductInitial);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState(initialCategories[0]?.id || null);

  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [editStockValue, setEditStockValue] = useState("");

  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState("");
  const [isDraggingProductImage, setIsDraggingProductImage] = useState(false);
  const productImageInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingProductImage(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingProductImage(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingProductImage(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();
      setUploadedImageUrl(data.url);
    } catch (err) {
      console.error(err);
      alert("Error al subir la imagen.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();
      setUploadedImageUrl(data.url);
    } catch (err) {
      console.error(err);
      alert("Error al subir la imagen.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("name", newCategoryName);
    const res = await createProductCategory(formData);
    if (res.success) {
      setNewCategoryName("");
      setIsAddingCategory(false);
      window.location.reload();
    }
  };

  const handleAddProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append("categoryId", activeCategoryId);
    if (uploadedImageUrl) {
      formData.append("image", uploadedImageUrl);
    }
    const res = await createProduct(formData);
    if (res.success) {
      setIsAddingProduct(false);
      setUploadedImageUrl("");
      window.location.reload();
    }
  };

  const handleSaveStock = async (productId: string) => {
    const res = await updateProductStock(productId, Number(editStockValue));
    if (res.success) {
      setEditingStockId(null);
      window.location.reload();
    }
  };

  const handleDelete = async (productId: string) => {
    if (confirm("¿Estás seguro de eliminar este producto?")) {
      const res = await deleteProduct(productId);
      if (res.success) window.location.reload();
    }
  };

  const activeCategory = categories.find(c => c.id === activeCategoryId);

  return (
    <div className="space-y-6">
      {/* Top Bar Config */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings2 className="w-5 h-5 text-gray-400" />
          <div>
            <h3 className="text-sm font-bold text-gray-800">Descuento Automático</h3>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Restar stock al aprobar cotización (Próximamente)</p>
          </div>
        </div>
        <button 
          onClick={() => setAutoDeduct(!autoDeduct)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoDeduct ? 'bg-indigo-600' : 'bg-gray-200'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoDeduct ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Categories Sidebar */}
        <div className="w-full md:w-64 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-black text-gray-800 uppercase tracking-widest">Categorías</h2>
              <button 
                onClick={() => setIsAddingCategory(true)}
                className="text-indigo-600 hover:text-indigo-700 bg-indigo-50 p-1.5 rounded-lg"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {isAddingCategory && (
              <form onSubmit={handleAddCategory} className="mb-4 flex gap-2">
                <input 
                  type="text" 
                  value={newCategoryName} 
                  onChange={e => setNewCategoryName(e.target.value)} 
                  placeholder="Ej. Termos" 
                  className="w-full text-xs border rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                  autoFocus
                />
                <button type="submit" className="bg-indigo-600 text-white p-1.5 rounded-lg"><Check className="w-4 h-4"/></button>
                <button type="button" onClick={() => setIsAddingCategory(false)} className="bg-gray-100 text-gray-500 p-1.5 rounded-lg"><X className="w-4 h-4"/></button>
              </form>
            )}

            <div className="space-y-1">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategoryId(cat.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeCategoryId === cat.id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  {cat.name}
                </button>
              ))}
              {categories.length === 0 && <p className="text-xs text-gray-400 text-center py-2">No hay categorías</p>}
            </div>
          </div>
        </div>

        {/* Products Area */}
        <div className="flex-1">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {activeCategory ? (
              <>
                <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
                  <h2 className="text-base font-black text-gray-900 uppercase tracking-widest">{activeCategory.name}</h2>
                  <button 
                    onClick={() => setIsAddingProduct(true)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
                  >
                    <PackagePlus className="w-4 h-4" /> Agregar Producto
                  </button>
                </div>

                {isAddingProduct && (
                  <form onSubmit={handleAddProduct} className="p-5 border-b border-gray-100 bg-indigo-50/30 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Nombre *</label>
                      <input name="name" required className="w-full border-gray-200 rounded-lg text-sm px-3 py-2" placeholder="Ej. Termo Yeti 20oz" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Modelo / SKU</label>
                      <input name="model" className="w-full border-gray-200 rounded-lg text-sm px-3 py-2" placeholder="YT-20" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Color</label>
                      <input name="color" className="w-full border-gray-200 rounded-lg text-sm px-3 py-2" placeholder="Negro Mate" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Stock Inicial</label>
                      <input name="stockQuantity" type="number" defaultValue={0} className="w-full border-gray-200 rounded-lg text-sm px-3 py-2 font-bold text-indigo-700" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Costo ($)</label>
                      <input name="unitCost" type="number" step="0.01" defaultValue={0} className="w-full border-gray-200 rounded-lg text-sm px-3 py-2 text-red-600 font-bold" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Precio Venta ($)</label>
                      <input name="unitPrice" type="number" step="0.01" defaultValue={0} className="w-full border-gray-200 rounded-lg text-sm px-3 py-2 text-emerald-600 font-bold" />
                    </div>
                    <div className="md:col-span-2 bg-white/50 p-4 rounded-2xl border border-gray-100 shadow-inner">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Imagen de Referencia</label>
                      <div 
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => productImageInputRef.current?.click()}
                        className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200
                          ${isDraggingProductImage ? 'border-indigo-600 bg-indigo-50/50' : 'border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-gray-50'}
                          ${isUploading ? 'opacity-50 pointer-events-none' : ''}
                        `}
                      >
                        <input
                          ref={productImageInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <div className={`p-2.5 rounded-full mb-1.5 transition-colors ${isDraggingProductImage ? 'bg-indigo-100 text-indigo-600' : 'bg-white text-gray-400 shadow-sm'}`}>
                            <PackagePlus className="w-5 h-5" />
                          </div>
                          <p className="text-xs font-bold text-gray-700">
                            {isDraggingProductImage ? '¡Suelta la imagen aquí!' : 'Haz clic para subir o arrastra la imagen'}
                          </p>
                          <p className="text-[10px] text-gray-400 font-medium">Archivos PNG, JPG o WEBP</p>
                        </div>
                      </div>
                      
                      {isUploading && <p className="text-xs text-indigo-600 font-bold animate-pulse text-center mt-2.5">Subiendo y optimizando imagen...</p>}
                      
                      {uploadedImageUrl && (
                        <div className="mt-3 flex items-center justify-between bg-white border border-gray-100 p-2.5 rounded-xl shadow-sm">
                          <div className="flex items-center gap-3">
                            <img src={uploadedImageUrl} className="w-10 h-10 object-cover rounded-lg border border-gray-200" alt="Preview" />
                            <div>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Estado</p>
                              <span className="text-xs text-emerald-600 font-bold">¡Imagen lista!</span>
                            </div>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => setUploadedImageUrl("")}
                            className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                      <button type="button" onClick={() => setIsAddingProduct(false)} className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg">Cancelar</button>
                      <button type="submit" className="px-6 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-600/10">Guardar Producto</button>
                    </div>
                  </form>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50">
                        <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Producto</th>
                        <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Atributos</th>
                        <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Stock</th>
                        <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Precio</th>
                        <th className="p-4 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeCategory.products.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-sm text-gray-400 font-medium">No hay productos en esta categoría.</td>
                        </tr>
                      ) : (
                        activeCategory.products.map((p: any) => (
                          <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                            <td className="p-4 flex items-center gap-3">
                              {p.image ? (
                                <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-100 shadow-sm flex-shrink-0">
                                  <img src={p.image} className="w-full h-full object-cover" alt={p.name} />
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center border border-gray-100 flex-shrink-0">
                                  <Box className="w-5 h-5 text-gray-300" />
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-bold text-gray-900">{p.name}</p>
                                {p.model && <p className="text-[10px] text-gray-400 font-mono mt-0.5">{p.model}</p>}
                              </div>
                            </td>
                            <td className="p-4">
                              {p.color && <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded uppercase tracking-wider">{p.color}</span>}
                            </td>
                            <td className="p-4 text-center">
                              {editingStockId === p.id ? (
                                <div className="flex items-center justify-center gap-1">
                                  <input 
                                    type="number" 
                                    value={editStockValue} 
                                    onChange={e => setEditStockValue(e.target.value)}
                                    className="w-16 text-center text-sm font-bold border-gray-200 rounded p-1"
                                    autoFocus
                                  />
                                  <button onClick={() => handleSaveStock(p.id)} className="text-emerald-600 p-1 hover:bg-emerald-50 rounded"><Check className="w-4 h-4"/></button>
                                  <button onClick={() => setEditingStockId(null)} className="text-gray-400 p-1 hover:bg-gray-100 rounded"><X className="w-4 h-4"/></button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-2 group cursor-pointer" onClick={() => { setEditingStockId(p.id); setEditStockValue(p.stockQuantity.toString()); }}>
                                  <span className={`text-base font-black ${p.stockQuantity <= 5 ? 'text-red-500' : 'text-gray-900'}`}>{p.stockQuantity}</span>
                                  <Edit2 className="w-3 h-3 text-gray-300 group-hover:text-indigo-500 transition-colors" />
                                </div>
                              )}
                            </td>
                            <td className="p-4 text-right">
                              <p className="text-sm font-black text-emerald-600">${p.unitPrice.toFixed(2)}</p>
                              <p className="text-[10px] font-bold text-gray-400">Costo: ${p.unitCost.toFixed(2)}</p>
                            </td>
                            <td className="p-4">
                              <button onClick={() => handleDelete(p.id)} className="text-gray-300 hover:text-red-600 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="p-12 text-center flex flex-col items-center justify-center text-gray-400">
                <Box className="w-12 h-12 mb-3 text-gray-200" />
                <p className="text-sm font-medium">Selecciona o crea una categoría para empezar</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
