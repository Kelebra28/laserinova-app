"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Calculator, Save, Plus, Trash2, Info, DollarSign, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import SubmitButton from "@/components/ui/SubmitButton";
import { calculateConcept, CalculationInput, GlobalCosts, MaterialData } from "@/lib/calculations";
import { updateQuoteAction } from "@/server/actions/quote.actions";
import MaterialSelector from "@/components/quotes/MaterialSelector";
import ClientSelector from "@/components/quotes/ClientSelector";
import ConfirmSaveModal from "@/components/ui/ConfirmSaveModal";
import { ImageUploadUI } from "@/components/ui/ImageUploadUI";
import { useImageUpload } from "@/hooks/useImageUpload";
import CalculationAudit from "@/components/quotes/CalculationAudit";


interface EditQuoteFormProps {
  quote: any;
  clients: any[];
  materials: any[];
  products?: any[];
  globalCosts: GlobalCosts;
  userId?: string;
}

export default function EditQuoteForm({ quote, clients, materials, products = [], globalCosts, userId }: EditQuoteFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [clientId, setClientId] = useState(quote.clientId || "");
  const [prospectName, setProspectName] = useState((quote as any).prospectName || "");
  const [project, setProject] = useState(quote.project || "");
  const [description, setDescription] = useState(quote.description || "");
  const [taxable, setTaxable] = useState(quote.taxable || false);
  const [isWholesale, setIsWholesale] = useState(false); // Podríamos guardarlo en DB pero por ahora default false
  const [margin, setMargin] = useState(globalCosts.margen_default || 35);
  
  const parsedImages = quote.images ? (typeof quote.images === 'string' ? JSON.parse(quote.images) : quote.images) : [];
  const [images, setImages] = useState<string[]>(Array.isArray(parsedImages) ? parsedImages : []);
  const { isUploading, handleFileChange, uploadImages, deleteImage } = useImageUpload();

  const handleRemoveImage = async (index: number) => {
    const urlToRemove = images[index];
    setImages(prev => prev.filter((_, i) => i !== index));
    if (urlToRemove) {
      await deleteImage(urlToRemove);
    }
  };

  // Mapear conceptos de DB a estado del form
  const [concepts, setConcepts] = useState<any[]>(
    quote.concepts.map((c: any) => ({
      id: c.id,
      type: c.conceptType,
      description: c.description,
      quantity: c.quantity,
      materialId: c.materialId,
      partWidth: c.width,
      partHeight: c.height,
      timeMin: c.cutTime,
      clientProvidesMaterial: c.clientProvidesMaterial,
      details: c.details,
      unitPrice: c.finalUnitPrice,
      totalAmount: c.totalAmount,
      realCost: c.realCost,
      manualUnitPrice: c.finalUnitPrice,
      manualUnitCost: (c.realCost || 0) / (c.quantity || 1),
      serviceDays: c.serviceDays || 0,
      serviceHours: c.serviceHours || 0,
      operatorCost: c.operatorCost,
      transportCost: c.transportCost,
      installCost: c.installCost,
      laserUseCost: c.laserUseCost,
      consumablesCost: c.consumablesCost,
      viaticsCost: c.viaticsCost,
      margin: c.margin,
      utility: c.utility || (c.totalAmount - c.realCost),
      finalUnitPrice: c.finalUnitPrice,
      calculated: {
        finalUnitPrice: c.finalUnitPrice,
        totalAmount: c.totalAmount,
        realCost: c.realCost,
        suggestedPrice: c.suggestedPrice,
        materialCost: c.materialCost,
        productionCost: c.productionCost,
        utility: c.utility || (c.totalAmount - c.realCost),
      }
    }))
  );


  // Recalcular conceptos si cambian materiales o parámetros
  const updateConcept = (id: string, field: string, value: any) => {
    setConcepts(prev => prev.map(c => {
      if (c.id === id) {
        const updated = { ...c, [field]: value };
        
        // Si el campo afecta el cálculo, recalcular
        if (["type", "quantity", "materialId", "partWidth", "partHeight", "timeMin", "clientProvidesMaterial", "manualUnitPrice", "manualUnitCost", "serviceDays", "serviceHours", "transportCost", "margin", "operatorCost", "installCost", "laserUseCost", "consumablesCost", "viaticsCost"].includes(field)) {
          
          // Al cambiar parámetros de la fórmula (tiempo, ancho, material, etc.), reseteamos el precio manual para forzar recálculo
          if (["materialId", "partWidth", "partHeight", "timeMin", "clientProvidesMaterial", "serviceDays", "serviceHours", "transportCost", "operatorCost", "installCost", "laserUseCost", "consumablesCost", "viaticsCost"].includes(field)) {
            updated.manualUnitPrice = "";
            updated.manualUnitCost = "";
          }

          const mat = materials.find(m => m.id === (field === "materialId" ? value : updated.materialId));
          const result = calculateConcept(
            {
              type: updated.type,
              quantity: Number(updated.quantity),
              material: mat ? {
                length: mat.length,
                width: mat.width,
                sheetPrice: mat.sheetPrice,
                guardPercentage: mat.guardPercentage,
                pricePerCm2: mat.pricePerCm2,
              } : undefined,
              partWidth: Number(updated.partWidth),
              partHeight: Number(updated.partHeight),
              timeMin: Number(updated.timeMin),
              clientProvidesMaterial: updated.clientProvidesMaterial,
              isWholesale: isWholesale,
              manualUnitPrice: Number(updated.manualUnitPrice) || 0,
              manualCost: Number(updated.manualUnitCost) || 0,
              serviceDays: Number(updated.serviceDays) || 0,
              serviceHours: Number(updated.serviceHours) || 0,
              operatorCost: updated.operatorCost !== undefined && updated.operatorCost !== "" ? Number(updated.operatorCost) : undefined,
              transportCost: updated.transportCost !== undefined && updated.transportCost !== "" ? Number(updated.transportCost) : undefined,
              installCost: updated.installCost !== undefined && updated.installCost !== "" ? Number(updated.installCost) : undefined,
              laserUseCost: updated.laserUseCost !== undefined && updated.laserUseCost !== "" ? Number(updated.laserUseCost) : undefined,
              consumablesCost: updated.consumablesCost !== undefined && updated.consumablesCost !== "" ? Number(updated.consumablesCost) : undefined,
              viaticsCost: updated.viaticsCost !== undefined && updated.viaticsCost !== "" ? Number(updated.viaticsCost) : undefined,
              margin: updated.margin !== undefined && updated.margin !== "" ? Number(updated.margin) : undefined,
            },
            { ...globalCosts, margen_default: Number(margin) || 35 } // Usar el margen actual
          );

          const suggestedUnit = result.suggestedPrice / (Number(updated.quantity) || 1);
          // Si cambian parámetros de la fórmula (que no sean cantidad), forzamos a actualizar el precio final
          const isParameterChange = field !== "quantity";
          const finalUnit = (isParameterChange || !updated.finalUnitPrice || Number(updated.finalUnitPrice) <= 0)
            ? suggestedUnit
            : updated.finalUnitPrice;
          const finalUnitNum = Number(finalUnit) || 0;
          const totalAmount = finalUnitNum * (Number(updated.quantity) || 1);
          return { ...updated, calculated: { ...result, utility: totalAmount - result.realCost }, finalUnitPrice: finalUnit, totalAmount: totalAmount };
        }
        
        // Si se cambia el precio final manualmente
        if (field === "finalUnitPrice") {
          const finalPrice = Number(parseFloat(value)) || 0;
          const totalAmount = finalPrice * Number(updated.quantity || 0);
          const utility = totalAmount - (Number(updated.calculated?.realCost) || 0);
          return { ...updated, finalUnitPrice: finalPrice, totalAmount, calculated: { ...updated.calculated, finalUnitPrice: finalPrice, totalAmount, utility } };
        }

        return updated;
      }
      return c;
    }));
  };

  // Recalcular todo si cambia el margen o el tipo de venta
  useEffect(() => {
    setConcepts(prev => prev.map(c => {
      const mat = materials.find(m => m.id === c.materialId);
      const result = calculateConcept(
        {
          type: c.type,
          quantity: Number(c.quantity),
          material: mat ? {
            length: mat.length,
            width: mat.width,
            sheetPrice: mat.sheetPrice,
            guardPercentage: mat.guardPercentage,
            pricePerCm2: mat.pricePerCm2,
          } : undefined,
          partWidth: Number(c.partWidth),
          partHeight: Number(c.partHeight),
          timeMin: Number(c.timeMin),
          clientProvidesMaterial: c.clientProvidesMaterial,
          isWholesale: isWholesale,
          manualUnitPrice: Number(c.manualUnitPrice) || 0,
          manualCost: Number(c.manualUnitCost) || 0,
          serviceDays: Number(c.serviceDays) || 0,
          serviceHours: Number(c.serviceHours) || 0,
          operatorCost: c.operatorCost !== undefined && c.operatorCost !== "" ? Number(c.operatorCost) : undefined,
          transportCost: c.transportCost !== undefined && c.transportCost !== "" ? Number(c.transportCost) : undefined,
          installCost: c.installCost !== undefined && c.installCost !== "" ? Number(c.installCost) : undefined,
          laserUseCost: c.laserUseCost !== undefined && c.laserUseCost !== "" ? Number(c.laserUseCost) : undefined,
          consumablesCost: c.consumablesCost !== undefined && c.consumablesCost !== "" ? Number(c.consumablesCost) : undefined,
          viaticsCost: c.viaticsCost !== undefined && c.viaticsCost !== "" ? Number(c.viaticsCost) : undefined,
          margin: c.margin !== undefined && c.margin !== "" ? Number(c.margin) : undefined,
        },
        { ...globalCosts, margen_default: Number(margin) || 35 }
      );
      const suggestedUnit = result.suggestedPrice / (Number(c.quantity) || 1);
      // Si cambia el margen global o mayoreo, actualizamos el precio final unitario de los conceptos de fórmula
      const isFormulaType = ["CORTE", "GRABADO", "SERVICIO_SITIO"].includes(c.type);
      const finalUnit = (isFormulaType || !c.finalUnitPrice || Number(c.finalUnitPrice) <= 0) ? suggestedUnit : c.finalUnitPrice;
      const finalUnitNum = Number(finalUnit) || 0;
      const totalAmount = finalUnitNum * (Number(c.quantity) || 1);
      return { ...c, calculated: { ...result, utility: totalAmount - result.realCost }, finalUnitPrice: finalUnit, totalAmount: totalAmount };
    }));
  }, [margin, isWholesale, globalCosts, materials]);

  const addConcept = (type: "CORTE" | "GRABADO" | "IMPRESION" | "PRODUCTO" | "OTRO" | "RESALE" | "SERVICIO_SITIO") => {
    const newId = crypto.randomUUID();
    setConcepts([
      ...concepts,
      {
        id: newId,
        type,
        description: "",
        quantity: 1,
        materialId: "",
        partWidth: 0,
        partHeight: 0,
        timeMin: 0,
        manualUnitPrice: "",
        manualUnitCost: "",
        clientProvidesMaterial: false,
        finalUnitPrice: 0,
        totalAmount: 0,
        details: "",
        serviceDays: 0,
        serviceHours: 0,
        operatorCost: "",
        transportCost: "",
        installCost: "",
        laserUseCost: "",
        consumablesCost: "",
        viaticsCost: "",
        margin: "",
        calculated: null
      }
    ]);
  };

  const removeConcept = (id: string) => {
    setConcepts(concepts.filter(c => c.id !== id));
  };

  const { subtotal, iva, total, costoReal, utilidad } = useMemo(() => {
    const totalFinal = concepts.reduce((sum, c) => sum + (Number(c.totalAmount) || 0), 0);
    const real = concepts.reduce((sum, c) => sum + (Number(c.calculated?.realCost) || 0), 0);
    
    const ivaPercentage = Number(globalCosts?.porcentaje_iva) || 16;

    if (!taxable) {
      return { subtotal: totalFinal, iva: 0, total: totalFinal, costoReal: real, utilidad: totalFinal - real };
    }

    const subtotalVal = totalFinal;
    const taxVal = subtotalVal * (ivaPercentage / 100);
    const totalVal = subtotalVal + taxVal;
    const util = subtotalVal - real;

    return { subtotal: subtotalVal, iva: taxVal, total: totalVal, costoReal: real, utilidad: util };

  }, [concepts, globalCosts, isWholesale, margin, taxable]);



  return (
    <>
    <form ref={formRef} action={updateQuoteAction} className="space-y-8">
      <input type="hidden" name="quoteId" value={quote.id} />
      <input type="hidden" name="userId" value={quote.userId} />
      <input type="hidden" name="subtotal" value={subtotal} />
      <input type="hidden" name="tax" value={iva} />
      <input type="hidden" name="total" value={total} />
      <input type="hidden" name="realCostTotal" value={costoReal} />
      <input type="hidden" name="estimatedUtility" value={utilidad} />
      <input type="hidden" name="taxable" value={taxable ? "true" : "false"} />
      <input type="hidden" name="concepts" value={JSON.stringify(concepts)} />
      <input type="hidden" name="images" value={JSON.stringify(images)} />

      {/* 1. Información General */}
      <div className="bg-white shadow-sm border border-gray-100 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-6">
          <Info className="w-5 h-5 text-red-600" />
          <h2 className="text-lg font-medium text-gray-900">Información General</h2>
        </div>
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-5">
          <div className="md:col-span-2">
            <ClientSelector 
              clients={clients} 
              value={clientId} 
              onChange={setClientId}
              onProspectNameChange={setProspectName}
              prospectName={prospectName}
            />
          </div>

          <div className="md:col-span-1">
            <label htmlFor="project" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
              Nombre del Proyecto *
            </label>
            <input
              type="text"
              name="project"
              id="project"
              required
              value={project}
              onChange={(e) => setProject(e.target.value)}
              className="w-full text-sm font-medium border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-red-600/10 focus:border-red-600 transition-all outline-none text-gray-900 shadow-sm"
            />
          </div>

          <div className="sm:col-span-2 md:col-span-2">
            <label htmlFor="description" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
              Descripción General (Opcional)
            </label>
            <input
              type="text"
              id="description"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Servicio de personalización..."
              className="w-full text-sm font-medium border-gray-200 rounded-xl px-4 py-3 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-red-600/10 focus:border-red-600 transition-all outline-none text-gray-900 shadow-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <ImageUploadUI
              imageUrls={images}
              isUploading={isUploading}
              onFileChange={(e) => handleFileChange(e, (newUrls) => setImages(prev => [...prev, ...newUrls]))}
              onFilesDropped={async (files) => {
                const uploadedUrls = await uploadImages(files);
                if (uploadedUrls.length > 0) setImages(prev => [...prev, ...uploadedUrls]);
              }}
              onRemoveImage={handleRemoveImage}
            />
          </div>

          <div className="sm:col-span-6 flex flex-wrap items-center gap-8 pt-2">
            <div className="flex items-center group cursor-pointer">
              <div className="relative flex items-center">
                <input
                  id="isWholesale"
                  type="checkbox"
                  checked={isWholesale}
                  onChange={(e) => setIsWholesale(e.target.checked)}
                  className="peer h-5 w-5 appearance-none rounded border border-gray-300 bg-white checked:bg-red-600 checked:border-red-600 transition-all cursor-pointer"
                />
                <Check className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none left-0.5" />
              </div>
              <label htmlFor="isWholesale" className="ml-3 block text-[11px] font-black text-gray-500 uppercase tracking-widest cursor-pointer group-hover:text-red-600 transition-colors">
                Precio de Mayoreo
              </label>
            </div>

            <div
              onClick={() => setTaxable(!taxable)}
              className={`flex items-center gap-3 px-5 py-3 rounded-2xl border-2 cursor-pointer transition-all select-none shadow-sm ${taxable ? 'bg-red-50 border-red-200 text-red-700' : 'bg-gray-50 border-gray-200 text-gray-400'}`}
            >
              <div className={`w-10 h-5 rounded-full transition-all relative ${taxable ? 'bg-red-600' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${taxable ? 'left-5.5' : 'left-0.5'}`} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.1em]">
                {taxable ? 'Con IVA (16%)' : 'Sin IVA / Efectivo'}
              </span>
            </div>

            <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-2xl border border-gray-100">
              <label htmlFor="margin" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">
                Margen:
              </label>
              <div className="relative w-20">
                <input
                  type="number"
                  id="margin"
                  value={margin === 0 && String(margin) !== "0" ? "" : margin}
                  onChange={(e) => setMargin(e.target.value === "" ? ("" as any) : Number(e.target.value))}
                  className="w-full text-center text-sm font-black text-red-600 bg-white border border-gray-200 rounded-xl py-2 px-1 focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-red-300">%</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 2. Conceptos */}
      <div className="bg-white shadow-sm border border-gray-100 rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <h2 className="text-lg font-medium text-gray-900">Conceptos</h2>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => addConcept("OTRO")} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-4 rounded-lg font-bold transition-all uppercase tracking-wider">
              + Otro
            </button>
            <button type="button" onClick={() => addConcept("SERVICIO_SITIO")} className="text-xs bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 py-2 px-4 rounded-lg font-bold transition-all uppercase tracking-wider">
              + Serv. en Sitio
            </button>
            <button type="button" onClick={() => addConcept("GRABADO")} className="text-xs bg-gray-100 hover:bg-orange-600 hover:text-white text-gray-800 py-2 px-4 rounded-lg font-bold transition-all uppercase tracking-wider">
              + Grabado
            </button>
            <button type="button" onClick={() => addConcept("IMPRESION")} className="text-xs bg-gray-100 hover:bg-blue-600 hover:text-white text-gray-800 py-2 px-4 rounded-lg font-bold transition-all uppercase tracking-wider">
              + Impresión
            </button>
            <button type="button" onClick={() => addConcept("CORTE")} className="text-xs bg-gray-100 hover:bg-red-600 hover:text-white text-gray-800 py-2 px-4 rounded-lg font-bold transition-all uppercase tracking-wider">
              + Corte
            </button>
            <button type="button" onClick={() => addConcept("RESALE")} className="text-xs bg-red-100 hover:bg-red-600 hover:text-white text-red-800 py-2 px-4 rounded-lg font-bold transition-all uppercase tracking-wider">
              + Reventa
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {concepts.map((concept, index) => (
            <div key={concept.id} className="border border-gray-100 rounded-xl p-6 bg-gray-50/50 relative group">
              <button
                type="button"
                onClick={() => removeConcept(concept.id)}
                className="absolute top-4 right-4 text-gray-300 hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3 mb-6">
                <span className={`text-[10px] font-black px-2 py-1 rounded-md text-white uppercase tracking-widest ${
                  concept.type === "CORTE" ? "bg-red-600" :
                  concept.type === "GRABADO" ? "bg-orange-600" :
                  concept.type === "IMPRESION" ? "bg-blue-600" :
                  concept.type === "PRODUCTO" ? "bg-emerald-600" : 
                  concept.type === "RESALE" ? "bg-red-700" :
                  concept.type === "SERVICIO_SITIO" ? "bg-violet-600" : "bg-gray-600"
                }`}>
                  {concept.type === "RESALE" ? "REVENTA" : concept.type === "SERVICIO_SITIO" ? "SERV. EN SITIO" : concept.type}
                </span>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Concepto #{index + 1}</span>
              </div>

              <div className="grid grid-cols-1 gap-y-6 gap-x-6 sm:grid-cols-12">
                {(concept.type === "RESALE" || concept.type === "PRODUCTO") && products.length > 0 ? (
                  <>
                    <div className="sm:col-span-4">
                      <label className="block text-[10px] font-bold text-indigo-700 uppercase tracking-widest mb-2 ml-1">Seleccionar del Inventario</label>
                      <select
                        onChange={(e) => {
                          const prodId = e.target.value;
                          const selectedProd = products.find(p => p.id === prodId);
                          if (selectedProd) {
                            const desc = `${selectedProd.name}${selectedProd.model ? ` (${selectedProd.model})` : ""}${selectedProd.color ? ` - ${selectedProd.color}` : ""}`;
                            updateConcept(concept.id, "description", desc);
                            updateConcept(concept.id, "manualUnitPrice", selectedProd.unitPrice);
                            updateConcept(concept.id, "manualUnitCost", selectedProd.unitCost);
                            
                            if (selectedProd.image && !images.includes(selectedProd.image)) {
                              setImages(prev => [...prev, selectedProd.image]);
                            }
                          }
                        }}
                        className="w-full text-sm font-bold border-indigo-200 rounded-xl px-4 py-3 bg-indigo-50/50 focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all outline-none text-indigo-900 shadow-sm"
                      >
                        <option value="">-- Buscar en almacén --</option>
                        {products.map((p: any) => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.model ? `(${p.model})` : ""} - {p.color || "Sin color"} (${p.unitPrice} MXN)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-4">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Descripción</label>
                      <input
                        type="text"
                        value={concept.description}
                        onChange={e => updateConcept(concept.id, "description", e.target.value)}
                        placeholder="Ej. Letrero de acrílico..."
                        className="w-full text-sm font-medium border-gray-200 rounded-xl px-4 py-3 bg-white focus:ring-4 focus:ring-red-600/10 focus:border-red-600 transition-all outline-none text-gray-900 shadow-sm"
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Detalles (para el PDF - Opcional)</label>
                      <textarea 
                        value={concept.details || ""} 
                        onChange={e => updateConcept(concept.id, "details", e.target.value)}
                        className="w-full text-sm font-medium border-gray-200 rounded-xl px-4 py-3 bg-white focus:ring-4 focus:ring-red-600/10 focus:border-red-600 transition-all outline-none text-gray-900 shadow-sm min-h-[46px]"
                        placeholder="Ej. Grabado profundo, limpieza de bordes, etc."
                        rows={1}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="sm:col-span-4">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Descripción</label>
                      <input
                        type="text"
                        value={concept.description}
                        onChange={e => updateConcept(concept.id, "description", e.target.value)}
                        placeholder="Ej. Letrero de acrílico..."
                        className="w-full text-sm font-medium border-gray-200 rounded-xl px-4 py-3 bg-white focus:ring-4 focus:ring-red-600/10 focus:border-red-600 transition-all outline-none text-gray-900 shadow-sm"
                      />
                    </div>
                    <div className="sm:col-span-8">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Detalles (para el PDF - Opcional)</label>
                      <textarea 
                        value={concept.details || ""} 
                        onChange={e => updateConcept(concept.id, "details", e.target.value)}
                        className="w-full text-sm font-medium border-gray-200 rounded-xl px-4 py-3 bg-white focus:ring-4 focus:ring-red-600/10 focus:border-red-600 transition-all outline-none text-gray-900 shadow-sm min-h-[46px]"
                        placeholder="Ej. Grabado profundo, limpieza de bordes, etc."
                        rows={1}
                      />
                    </div>
                  </>
                )}

                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    value={concept.quantity === 0 && String(concept.quantity) !== "0" ? "" : (concept.quantity ?? "")}
                    onChange={e => updateConcept(concept.id, "quantity", e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full text-sm font-black border-gray-200 rounded-xl px-4 py-3 bg-white focus:ring-4 focus:ring-red-600/10 focus:border-red-600 transition-all outline-none text-gray-900 shadow-sm"
                  />
                </div>

                <div className="sm:col-span-9">
                  <MaterialSelector 
                    materials={materials} 
                    value={concept.materialId}
                    onChange={(id) => updateConcept(concept.id, "materialId", id)}
                  />
                </div>

                {/* Parámetros según tipo */}
                {(concept.type === "RESALE" || concept.type === "IMPRESION" || concept.type === "PRODUCTO" || concept.type === "OTRO" || concept.type === "CORTE" || concept.type === "GRABADO" || concept.type === "SERVICIO_SITIO") && (
                  <>
                    <div className="sm:col-span-6">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Precio Venta Unitario (Sobrescribir $)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={concept.manualUnitPrice === 0 && String(concept.manualUnitPrice) !== "0" ? "" : (concept.manualUnitPrice ?? "")} 
                        onChange={e => updateConcept(concept.id, "manualUnitPrice", e.target.value)} 
                        className="w-full text-sm font-black border-emerald-200 rounded-xl px-4 py-3 bg-emerald-50/30 text-emerald-700 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all shadow-sm" 
                      />
                    </div>
                    <div className="sm:col-span-6">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Costo Real Unitario (Sobrescribir $)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={concept.manualUnitCost === 0 && String(concept.manualUnitCost) !== "0" ? "" : (concept.manualUnitCost ?? "")} 
                        onChange={e => updateConcept(concept.id, "manualUnitCost", e.target.value)} 
                        className="w-full text-sm font-black border-red-200 rounded-xl px-4 py-3 bg-red-50/30 text-red-600 focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all shadow-sm" 
                      />
                    </div>
                  </>
                )}

                {(concept.type === "CORTE" || concept.type === "GRABADO") && (
                  <>
                    <div className="sm:col-span-3">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Ancho (cm)</label>
                      <input type="number" step="0.1" value={concept.partWidth === 0 && String(concept.partWidth) !== "0" ? "" : (concept.partWidth ?? "")} onChange={e => updateConcept(concept.id, "partWidth", e.target.value === "" ? "" : Number(e.target.value))} className="w-full text-sm border-gray-200 rounded-lg p-2.5 border" />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Alto (cm)</label>
                      <input type="number" step="0.1" value={concept.partHeight === 0 && String(concept.partHeight) !== "0" ? "" : (concept.partHeight ?? "")} onChange={e => updateConcept(concept.id, "partHeight", e.target.value === "" ? "" : Number(e.target.value))} className="w-full text-sm border-gray-200 rounded-lg p-2.5 border" />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Tiempo (min)</label>
                      <input type="number" step="1" value={concept.timeMin === 0 && String(concept.timeMin) !== "0" ? "" : (concept.timeMin ?? "")} onChange={e => updateConcept(concept.id, "timeMin", e.target.value === "" ? "" : Number(e.target.value))} className="w-full text-sm border-gray-200 rounded-lg p-2.5 border" />
                    </div>
                    <div className="sm:col-span-3 flex items-center pt-4">
                      <input type="checkbox" checked={concept.clientProvidesMaterial} onChange={e => updateConcept(concept.id, "clientProvidesMaterial", e.target.checked)} className="h-4 w-4 text-red-600 rounded" />
                      <label className="ml-2 text-[10px] font-bold text-gray-400 uppercase">Cliente trae material</label>
                    </div>
                  </>
                )}

                {/* Parámetros para SERVICIO_SITIO */}
                {concept.type === "SERVICIO_SITIO" && (
                  <>
                    <div className="sm:col-span-12 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4 bg-violet-50/50 p-4 rounded-xl border border-violet-100">
                      <div className="col-span-2 sm:col-span-4 md:col-span-6 mb-2">
                        <span className="text-[10px] font-black text-violet-700 uppercase tracking-widest">Desglose de Costos por Día (Opcional - Modifica el Estándar)</span>
                      </div>
                      <div className="col-span-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Días</label>
                        <input type="number" step="0.1" value={concept.serviceDays === 0 && String(concept.serviceDays) !== "0" ? "" : (concept.serviceDays ?? "")} onChange={e => updateConcept(concept.id, "serviceDays", e.target.value === "" ? "" : Number(e.target.value))} className="w-full text-sm border-gray-200 rounded-lg p-2.5 border" />
                      </div>
                      <div className="col-span-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Horas/Día</label>
                        <input type="number" step="0.5" value={concept.serviceHours === 0 && String(concept.serviceHours) !== "0" ? "" : (concept.serviceHours ?? "")} onChange={e => updateConcept(concept.id, "serviceHours", e.target.value === "" ? "" : Number(e.target.value))} placeholder="8" className="w-full text-sm border-gray-200 rounded-lg p-2.5 border" />
                      </div>
                      
                      <div className="col-span-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Operador ($)</label>
                        <input type="number" step="0.01" value={concept.operatorCost ?? ""} onChange={e => updateConcept(concept.id, "operatorCost", e.target.value === "" ? "" : Number(e.target.value))} placeholder={String(globalCosts?.costo_operador_sitio || 1500)} className="w-full text-sm border-violet-200 rounded-lg p-2.5 border" />
                      </div>
                      <div className="col-span-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Transporte ($)</label>
                        <input type="number" step="0.01" value={concept.transportCost ?? ""} onChange={e => updateConcept(concept.id, "transportCost", e.target.value === "" ? "" : Number(e.target.value))} placeholder={String(globalCosts?.costo_transporte_sitio || 1500)} className="w-full text-sm border-violet-200 rounded-lg p-2.5 border" />
                      </div>
                      <div className="col-span-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Instalación ($)</label>
                        <input type="number" step="0.01" value={concept.installCost ?? ""} onChange={e => updateConcept(concept.id, "installCost", e.target.value === "" ? "" : Number(e.target.value))} placeholder={String(globalCosts?.costo_instalacion_sitio || 1000)} className="w-full text-sm border-violet-200 rounded-lg p-2.5 border" />
                      </div>
                      <div className="col-span-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Uso Láser ($)</label>
                        <input type="number" step="0.01" value={concept.laserUseCost ?? ""} onChange={e => updateConcept(concept.id, "laserUseCost", e.target.value === "" ? "" : Number(e.target.value))} placeholder={String(globalCosts?.costo_equipo_laser_sitio || 3500)} className="w-full text-sm border-violet-200 rounded-lg p-2.5 border" />
                      </div>
                      <div className="col-span-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Consumibles ($)</label>
                        <input type="number" step="0.01" value={concept.consumablesCost ?? ""} onChange={e => updateConcept(concept.id, "consumablesCost", e.target.value === "" ? "" : Number(e.target.value))} placeholder={String(globalCosts?.costo_consumibles_sitio || 1000)} className="w-full text-sm border-violet-200 rounded-lg p-2.5 border" />
                      </div>
                      <div className="col-span-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Viáticos ($)</label>
                        <input type="number" step="0.01" value={concept.viaticsCost ?? ""} onChange={e => updateConcept(concept.id, "viaticsCost", e.target.value === "" ? "" : Number(e.target.value))} placeholder={String(globalCosts?.costo_viaticos_sitio || 1300)} className="w-full text-sm border-violet-200 rounded-lg p-2.5 border" />
                      </div>
                      <div className="col-span-2 sm:col-span-4 md:col-span-6 mt-4 border-t border-violet-200 pt-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-violet-700 uppercase tracking-widest">Margen / Ganancia Específica</span>
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-gray-500">Ganancia (%)</label>
                            <input 
                              type="number" 
                              step="0.1" 
                              value={concept.margin ?? ""} 
                              onChange={e => updateConcept(concept.id, "margin", e.target.value === "" ? "" : Number(e.target.value))} 
                              placeholder="30" 
                              className="w-20 text-sm font-black text-emerald-700 border-violet-300 rounded-lg p-2 border focus:ring-emerald-500 focus:border-emerald-500 text-center" 
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Cálculo Final */}
                <div className="sm:col-span-12 mt-4 pt-4 border-t border-gray-200/50 flex flex-wrap items-center justify-between gap-6">
                  <div className="grid grid-cols-4 gap-4 items-end pt-4 mt-4 border-t border-gray-100">
                    <div>
                      <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Precio Unitario Real</span>
                      <div className="flex items-center">
                        <span className="text-gray-400 mr-1">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={concept.finalUnitPrice === 0 && String(concept.finalUnitPrice) !== "0" ? "" : (concept.finalUnitPrice ?? "")}
                          onChange={e => updateConcept(concept.id, "finalUnitPrice", e.target.value === "" ? "" : Number(e.target.value))}
                          className="w-24 text-sm font-black text-gray-900 border-none p-0 focus:ring-0 bg-transparent"
                        />
                      </div>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Sugerido (Total)</span>
                      <span className="text-xs font-bold text-gray-400 italic">${concept.calculated?.suggestedPrice?.toFixed(2) || 0}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Costo Real (Total)</span>
                      <span className="text-xs font-bold text-gray-400">${concept.calculated?.realCost?.toFixed(2) || 0}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Utilidad (Total)</span>
                      <span className={`text-xs font-bold ${concept.calculated?.utility! < 0 ? "text-red-500" : "text-emerald-500"}`}>
                        ${concept.calculated?.utility?.toFixed(2) || 0}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1 text-right">Subtotal Concepto</span>
                    <span className="text-lg font-black text-gray-900">
                      ${(Number(concept.totalAmount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer / Resumen */}
      <div className="bg-gray-900 text-white rounded-xl p-6 md:p-8 shadow-xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          <div>
            <div className="flex items-center gap-3 border-b border-gray-800 pb-4 mb-6">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <Calculator className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-lg font-black uppercase tracking-widest text-white">Análisis Interno</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm group">
                <span className="text-gray-400 font-medium group-hover:text-gray-300 transition-colors">Costo Total de Operación:</span>
                <span className="font-mono font-bold text-gray-100">
                  ${costoReal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Desglose Operativo */}
              <div className="bg-gray-800/50 rounded-lg p-3 space-y-2 border border-gray-700/50">
                <div className="flex justify-between items-center text-[11px] uppercase tracking-wider text-gray-500">
                  <span>Material Neto:</span>
                  <span className="font-mono text-gray-300">${concepts.reduce((sum, c) => sum + (Number(c.calculated?.materialBaseCost) || 0), 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] uppercase tracking-wider text-gray-500">
                  <span>Merma ({globalCosts?.porcentaje_merma_corte || 20}%):</span>
                  <span className="font-mono text-gray-300">${concepts.reduce((sum, c) => sum + (Number(c.calculated?.materialWastageCost) || 0), 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] uppercase tracking-wider text-gray-500">
                  <span>Costo Máquina/MO:</span>
                  <span className="font-mono text-gray-300">${concepts.reduce((sum, c) => sum + (Number(c.calculated?.productionCost) || 0), 0).toFixed(2)}</span>
                </div>
              </div>

              
              <div className="flex justify-between items-end group">
                <div>
                  <span className="text-gray-400 font-medium text-sm group-hover:text-gray-300 transition-colors block">Utilidad Proyectada:</span>
                  <span className="text-[10px] text-gray-500 font-bold uppercase">Neto: ${utilidad.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="text-right">
                  <span className={`text-lg font-black block leading-none ${utilidad < 0 ? "text-red-500" : "text-emerald-400"}`}>
                    ${(utilidad * (1 + (Number(globalCosts?.porcentaje_iva || 16) / 100))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[9px] text-gray-500 font-bold uppercase">Utilidad Bruta (C/IVA)</span>
                </div>
              </div>

              
              <div className="pt-4 border-t border-gray-800 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Margen sobre Venta</span>
                  <div className="flex items-center gap-2">
                    <div className={`h-1.5 w-12 rounded-full overflow-hidden bg-gray-800`}>
                      <div 
                        className={`h-full transition-all duration-500 ${utilidad < 0 ? "bg-red-500" : "bg-emerald-500"}`} 
                        style={{ width: `${Math.min(Math.max(subtotal > 0 ? (utilidad / subtotal) * 100 : 0, 0), 100)}%` }}
                      />
                    </div>
                    <span className={`text-sm font-black ${utilidad < 0 ? "text-red-500" : "text-emerald-400"}`}>
                      {subtotal > 0 ? ((utilidad / subtotal) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between h-full">
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-800 pb-4">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <DollarSign className="w-5 h-5 text-emerald-500" />
                </div>
                <h3 className="text-lg font-black uppercase tracking-widest text-white">Resumen de Venta</h3>
              </div>
              
              <div className="flex justify-end items-center mt-2">
                <button 
                  type="button" 
                  onClick={() => setShowAudit(true)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Calculator className="w-4 h-4" />
                  Ver Desglose Matemático
                </button>
              </div>

            {/* Modal de Auditoría */}
            {showAudit && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl">
                  <button 
                    type="button" 
                    onClick={() => setShowAudit(false)}
                    className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                  >
                    ✕
                  </button>
                  <CalculationAudit concepts={concepts} margin={margin} />
                </div>
              </div>
            )}
            
            <div className="space-y-4">
                <div className="flex justify-between items-center text-sm group">
                  <span className="text-gray-400 font-medium group-hover:text-gray-300 transition-colors">Subtotal:</span>
                  <span className="font-mono font-bold text-gray-100">${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                
                <div className="flex justify-between items-center text-sm group">
                  <span className="text-gray-400 font-medium group-hover:text-gray-300 transition-colors">IVA ({globalCosts?.porcentaje_iva || 16}%):</span>
                  <span className="font-mono font-bold text-gray-100">${iva.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                
                <div className="pt-4 mt-4 border-t border-gray-800">
                  <div className="flex justify-between items-end">
                    <span className="text-sm font-black text-gray-500 uppercase tracking-widest mb-1">Total a Pagar</span>
                    <div className="text-right">
                      <span className="text-4xl font-black text-red-500 block leading-none">
                        ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] text-gray-500 font-bold uppercase mt-1 block">Pesos Mexicanos (MXN)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12 flex justify-end gap-4">
              <Link
                href={`/dashboard/quotes/${quote.id}`}
                className="inline-flex items-center justify-center py-4 px-8 border border-gray-200 text-gray-600 text-sm font-bold rounded-lg hover:bg-gray-50 transition-all active:scale-95"
              >
                Cancelar
              </Link>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowConfirm(true)}
                className="flex items-center py-4 px-12 text-sm font-black uppercase tracking-widest rounded-lg shadow-lg shadow-blue-900/20 bg-blue-600 hover:bg-blue-700 transition-all active:scale-95 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                {isSubmitting ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </div>
        </div>
      </div>
      <button type="submit" ref={submitBtnRef} className="hidden" />
    </form>

    <ConfirmSaveModal
      isOpen={showConfirm}
      onConfirm={() => {
        setShowConfirm(false);
        setIsSubmitting(true);
        setTimeout(() => {
          submitBtnRef.current?.click();
        }, 50);
      }}
      onCancel={() => setShowConfirm(false)}
      title="¿Guardar cambios en cotización?"
      message={`Se actualizará el folio ${quote.folio}`}
      detail={`Total: $${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
      confirmLabel="Actualizar"
    />
    </>
  );
}
