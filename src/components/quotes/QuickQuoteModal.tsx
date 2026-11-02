"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  X, 
  Zap, 
  Plus, 
  Trash2, 
  Copy, 
  MessageCircle, 
  RotateCcw, 
  Check, 
  Package, 
  Scissors, 
  DollarSign, 
  TrendingUp, 
  User, 
  Phone,
  Sparkles
} from "lucide-react";
import { toast } from "react-hot-toast";
import { calculateConcept, GlobalCosts } from "@/lib/calculations";
import { getQuickQuoteDataAction } from "@/server/actions/quote.actions";

interface MaterialItem {
  id: string;
  name: string;
  length?: number | null;
  width?: number | null;
  sheetPrice?: number | null;
  guardPercentage?: number | null;
  pricePerCm2?: number | null;
}

interface ProductItem {
  id: string;
  sku?: string | null;
  name: string;
  unitCost: number;
  unitPrice: number;
  image?: string | null;
}

interface ClientItem {
  id: string;
  name: string;
  phone?: string | null;
  company?: string | null;
}

interface QuickItem {
  id: string;
  type: "PRODUCT" | "LASER";
  // Producto
  productId?: string;
  productName?: string;
  // Laser
  materialId?: string;
  materialName?: string;
  partWidth?: number;
  partHeight?: number;
  timeMin?: number;
  // Comunes
  description: string;
  quantity: number;
  margin: number;
  unitCost: number;
  suggestedUnitPrice: number;
  finalUnitPrice: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickQuoteModal({ isOpen, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [globalCosts, setGlobalCosts] = useState<GlobalCosts>({
    costo_minuto_mayoreo: 8.5,
    costo_minuto_menudeo: 10,
    porcentaje_iva: 16,
    factor_guarda_default: 1.2,
    margen_default: 50,
    factor_produccion_default: 3,
    precio_tubo: 250000,
    vida_util_tubo: 6000,
    factor_miedo: 2,
    porcentaje_transporte_material: 20,
    porcentaje_merma_corte: 20,
  });

  // Datos de contacto
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [includeIvaNote, setIncludeIvaNote] = useState(true);

  // Partidas
  const [items, setItems] = useState<QuickItem[]>([]);

  // Mensaje de WhatsApp
  const [customMessage, setCustomMessage] = useState("");
  const [isManualEdit, setIsManualEdit] = useState(false);
  const [copied, setCopied] = useState(false);

  // Cargar datos al abrir
  useEffect(() => {
    if (isOpen && materials.length === 0) {
      setLoading(true);
      getQuickQuoteDataAction()
        .then((res) => {
          if (res.success && res.data) {
            setMaterials(res.data.materials);
            setProducts(res.data.products);
            setClients(res.data.clients);
            setGlobalCosts(res.data.globalCosts as GlobalCosts);
            // Iniciar con 1 partida por defecto
            if (items.length === 0) {
              setItems([createEmptyItem(res.data.globalCosts.margen_default || 50)]);
            }
          }
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  const createEmptyItem = (marginDefault: number): QuickItem => ({
    id: crypto.randomUUID(),
    type: "PRODUCT",
    description: "",
    quantity: 10,
    margin: marginDefault,
    unitCost: 0,
    suggestedUnitPrice: 0,
    finalUnitPrice: 0,
  });

  const addItem = () => {
    setItems((prev) => [...prev, createEmptyItem(globalCosts.margen_default || 50)]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) {
      toast.error("Debe haber al menos una partida");
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Recalcular una partida
  const updateItem = (id: string, updates: Partial<QuickItem>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const merged = { ...item, ...updates };

        let calculatedCost = merged.unitCost;
        let suggested = merged.suggestedUnitPrice;

        if (merged.type === "PRODUCT") {
          const prod = products.find((p) => p.id === merged.productId);
          if (prod) {
            calculatedCost = Number(prod.unitCost) || 0;
            const marginFactor = merged.margin >= 100 ? 0.01 : (100 - merged.margin) / 100;
            suggested = calculatedCost > 0 ? Math.round((calculatedCost / marginFactor) * 100) / 100 : prod.unitPrice || 0;
          }
        } else if (merged.type === "LASER") {
          const mat = materials.find((m) => m.id === merged.materialId);
          if (mat) {
            const result = calculateConcept(
              {
                type: "CORTE",
                quantity: Number(merged.quantity) || 1,
                material: mat,
                partWidth: Number(merged.partWidth) || 0,
                partHeight: Number(merged.partHeight) || 0,
                timeMin: Number(merged.timeMin) || 0,
                clientProvidesMaterial: false,
                isWholesale: false,
              },
              { ...globalCosts, margen_default: merged.margin }
            );
            const qty = Number(merged.quantity) || 1;
            calculatedCost = Math.round((result.realCost / qty) * 100) / 100;
            suggested = Math.round((result.suggestedPrice / qty) * 100) / 100;
          }
        }

        const finalPrice = updates.finalUnitPrice !== undefined 
          ? updates.finalUnitPrice 
          : (suggested > 0 ? suggested : merged.finalUnitPrice);

        return {
          ...merged,
          unitCost: calculatedCost,
          suggestedUnitPrice: suggested,
          finalUnitPrice: finalPrice,
        };
      })
    );
  };

  // Totales generales
  const totals = useMemo(() => {
    let totalSale = 0;
    let totalCost = 0;

    items.forEach((item) => {
      const q = Number(item.quantity) || 0;
      totalSale += (Number(item.finalUnitPrice) || 0) * q;
      totalCost += (Number(item.unitCost) || 0) * q;
    });

    const totalProfit = totalSale - totalCost;
    const profitMargin = totalSale > 0 ? (totalProfit / totalSale) * 100 : 0;

    return { totalSale, totalCost, totalProfit, profitMargin };
  }, [items]);

  // Generación automática del texto de WhatsApp
  const generatedTemplate = useMemo(() => {
    const greeting = clientName.trim() ? `¡Hola ${clientName.trim()}! 👋` : "¡Hola! 👋";
    const header = `${greeting} Con gusto te comparto la cotización solicitada de Laser Inova:\n`;

    const itemsText = items
      .map((item, index) => {
        const desc = item.description.trim() || item.productName || item.materialName || `Opción ${index + 1}`;
        const qty = item.quantity || 1;
        const price = (Number(item.finalUnitPrice) || 0).toLocaleString("es-MX", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        const ivaTag = includeIvaNote ? " (+ IVA)" : "";
        return `• *${qty}x ${desc}*\n  Precio unitario: *$${price}* MXN${ivaTag}`;
      })
      .join("\n\n");

    const disclaimer = includeIvaNote
      ? "\n\n📌 _* Precios unitarios más IVA._\n_Tiempo de entrega a convenir. Válido por 7 días._"
      : "\n\n📌 _Tiempo de entrega a convenir. Válido por 7 días._";

    const footer = "\n\nQuedo atento a tus comentarios si deseas hacer algún ajuste o confirmar tu pedido. ¡Saludos!";

    return `${header}\n${itemsText}${disclaimer}${footer}`;
  }, [items, clientName, includeIvaNote]);

  // Actualizar customMessage solo si no se ha editado manualmente
  useEffect(() => {
    if (!isManualEdit) {
      setCustomMessage(generatedTemplate);
    }
  }, [generatedTemplate, isManualEdit]);

  const handleCopy = () => {
    navigator.clipboard.writeText(customMessage);
    setCopied(true);
    toast.success("¡Texto copiado al portapapeles!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    const encoded = encodeURIComponent(customMessage);
    const cleanPhone = clientPhone.replace(/\D/g, "");
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, "_blank");
  };

  const handleReset = () => {
    setClientName("");
    setClientPhone("");
    setItems([createEmptyItem(globalCosts.margen_default || 50)]);
    setIsManualEdit(false);
    toast.success("Cotizador reseteado");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 px-6 py-5 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shadow-inner">
              <Zap className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                Cotizador Rápido Express
                <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2.5 py-0.5 rounded-full">
                  Sin PDF · Ultra Rápido
                </span>
              </h2>
              <p className="text-white/80 text-xs font-medium mt-0.5">
                Calcula costos y precios al instante y genera el mensaje de WhatsApp directo para el cliente.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* 1. Datos Rápidos del Cliente */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3 text-slate-700">
              <User className="w-4 h-4 text-red-600" />
              <span className="text-xs font-black uppercase tracking-wider">Cliente o Prospecto (Opcional)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Nombre</label>
                <input
                  type="text"
                  placeholder="Ej. Lic. Carlos Gómez"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Teléfono WhatsApp</label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="Ej. 5512345678"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. Partidas Rápidas */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-widest text-slate-700 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-red-600" />
                Partidas a Cotizar ({items.length})
              </span>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-xs font-black rounded-xl transition-all active:scale-95 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar Partida
              </button>
            </div>

            {items.map((item, index) => (
              <div 
                key={item.id} 
                className="bg-white border-2 border-slate-100 hover:border-slate-200 rounded-2xl p-4 shadow-sm transition-all space-y-3"
              >
                {/* Cabecera de la Partida */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-[11px] font-black flex items-center justify-center">
                      {index + 1}
                    </span>
                    {/* Selector de Tipo */}
                    <div className="inline-flex bg-slate-100 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => updateItem(item.id, { type: "PRODUCT" })}
                        className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-black rounded-lg transition-all ${
                          item.type === "PRODUCT"
                            ? "bg-white text-red-600 shadow-sm"
                            : "text-slate-500 hover:text-slate-900"
                        }`}
                      >
                        <Package className="w-3.5 h-3.5" />
                        Producto Reventa
                      </button>
                      <button
                        type="button"
                        onClick={() => updateItem(item.id, { type: "LASER" })}
                        className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-black rounded-lg transition-all ${
                          item.type === "LASER"
                            ? "bg-white text-indigo-600 shadow-sm"
                            : "text-slate-500 hover:text-slate-900"
                        }`}
                      >
                        <Scissors className="w-3.5 h-3.5" />
                        Corte / Láser
                      </button>
                    </div>
                  </div>

                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors"
                      title="Eliminar partida"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Campos según el Tipo */}
                {item.type === "PRODUCT" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-6">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                        Buscar Producto de Catálogo
                      </label>
                      <select
                        value={item.productId || ""}
                        onChange={(e) => {
                          const prod = products.find((p) => p.id === e.target.value);
                          updateItem(item.id, {
                            productId: e.target.value,
                            productName: prod?.name || "",
                            description: prod?.name || item.description,
                          });
                        }}
                        className="w-full px-3 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                      >
                        <option value="">-- Seleccionar producto --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.sku ? `[${p.sku}] ` : ""}{p.name} (${Number(p.unitCost) > 0 ? `$${p.unitCost} costo` : "Sin costo"})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-6">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                        Descripción para el Cliente
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. Termo metálico 500ml con grabado láser"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, { description: e.target.value })}
                        className="w-full px-3 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-4">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                        Material
                      </label>
                      <select
                        value={item.materialId || ""}
                        onChange={(e) => {
                          const mat = materials.find((m) => m.id === e.target.value);
                          updateItem(item.id, {
                            materialId: e.target.value,
                            materialName: mat?.name || "",
                            description: mat ? `Corte láser en ${mat.name}` : item.description,
                          });
                        }}
                        className="w-full px-3 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                      >
                        <option value="">-- Seleccionar material --</option>
                        {materials.map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Ancho (cm)</label>
                      <input
                        type="number"
                        placeholder="cm"
                        value={item.partWidth || ""}
                        onChange={(e) => updateItem(item.id, { partWidth: Number(e.target.value) })}
                        className="w-full px-2 py-2 text-xs text-center font-bold text-slate-800 bg-white border border-slate-200 rounded-xl outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Alto (cm)</label>
                      <input
                        type="number"
                        placeholder="cm"
                        value={item.partHeight || ""}
                        onChange={(e) => updateItem(item.id, { partHeight: Number(e.target.value) })}
                        className="w-full px-2 py-2 text-xs text-center font-bold text-slate-800 bg-white border border-slate-200 rounded-xl outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Min. Máquina</label>
                      <input
                        type="number"
                        placeholder="min"
                        value={item.timeMin || ""}
                        onChange={(e) => updateItem(item.id, { timeMin: Number(e.target.value) })}
                        className="w-full px-2 py-2 text-xs text-center font-bold text-slate-800 bg-white border border-slate-200 rounded-xl outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Detalle</label>
                      <input
                        type="text"
                        placeholder="Ej. Acrílico 3mm"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, { description: e.target.value })}
                        className="w-full px-2 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Cálculos numéricos de la partida */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 border-t border-slate-100 bg-slate-50/50 p-2.5 rounded-xl items-center">
                  <div>
                    <label className="block text-[9px] font-black uppercase text-slate-400">Cantidad</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity || ""}
                      onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 text-xs text-center font-black text-slate-800 bg-white border border-slate-200 rounded-lg outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black uppercase text-slate-400">Margen %</label>
                    <input
                      type="number"
                      value={item.margin || ""}
                      onChange={(e) => updateItem(item.id, { margin: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 text-xs text-center font-black text-slate-800 bg-white border border-slate-200 rounded-lg outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black uppercase text-slate-400">Costo Unit.</label>
                    <span className="block px-2 py-1.5 text-xs font-mono font-bold text-slate-500 bg-slate-100 rounded-lg text-center">
                      ${item.unitCost.toFixed(2)}
                    </span>
                  </div>

                  <div>
                    <label className="block text-[9px] font-black uppercase text-slate-400">P. Sugerido</label>
                    <span className="block px-2 py-1.5 text-xs font-mono font-bold text-slate-500 bg-slate-100 rounded-lg text-center">
                      ${item.suggestedUnitPrice.toFixed(2)}
                    </span>
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[9px] font-black uppercase text-red-600 font-bold">P. Venta Final</label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-red-400">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={item.finalUnitPrice || ""}
                        onChange={(e) => updateItem(item.id, { finalUnitPrice: Number(e.target.value) })}
                        className="w-full pl-5 pr-2 py-1.5 text-xs text-right font-black text-red-600 bg-red-50/50 border border-red-200 rounded-lg focus:ring-1 focus:ring-red-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 3. Resumen Financiero Rápido */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900 text-white p-4 rounded-2xl shadow-inner">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Venta</span>
              <span className="text-xl font-black text-emerald-400 font-mono">
                ${totals.totalSale.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Costo Total</span>
              <span className="text-lg font-black text-slate-300 font-mono">
                ${totals.totalCost.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Utilidad Est.</span>
              <span className="text-lg font-black text-emerald-300 font-mono">
                ${totals.totalProfit.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Margen Promedio</span>
              <span className="text-lg font-black text-amber-400 font-mono">
                {totals.profitMargin.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* 4. Plantilla Configurable de WhatsApp */}
          <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-900">
                <MessageCircle className="w-5 h-5 text-emerald-600" />
                <span className="text-xs font-black uppercase tracking-wider">
                  Mensaje Configurable para WhatsApp
                </span>
              </div>
              <div 
                onClick={() => {
                  setIncludeIvaNote(!includeIvaNote);
                  setIsManualEdit(false);
                }}
                className="flex items-center gap-2 cursor-pointer select-none"
              >
                <div className={`w-8 h-4 rounded-full transition-all relative ${includeIvaNote ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${includeIvaNote ? 'left-4.5' : 'left-0.5'}`} />
                </div>
                <span className="text-[10px] font-black uppercase text-emerald-800">
                  {includeIvaNote ? "Leyenda + IVA: Sí" : "Leyenda + IVA: No"}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 font-medium">
              Puedes editar directamente el texto abajo para añadir notas extras antes de enviar o copiar:
            </p>

            <textarea
              rows={7}
              value={customMessage}
              onChange={(e) => {
                setCustomMessage(e.target.value);
                setIsManualEdit(true);
              }}
              className="w-full p-3.5 text-xs font-mono text-slate-800 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-y leading-relaxed shadow-sm"
            />

            {isManualEdit && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsManualEdit(false)}
                  className="text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Restaurar plantilla automática
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-200/60 transition-colors"
          >
            <RotateCcw className="w-4 h-4 text-slate-400" />
            Limpiar Todo
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCopy}
              className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-95 ${
                copied
                  ? "bg-slate-900 text-white"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-500" />}
              {copied ? "¡Copiado!" : "Copiar Texto"}
            </button>

            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
            >
              <MessageCircle className="w-4 h-4" />
              Abrir WhatsApp
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
