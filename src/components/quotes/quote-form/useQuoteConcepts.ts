"use client";

import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  conceptWithProduct, conceptWithoutProduct, conceptsTotals, emptyConcept, repriceConcept, updateConceptField,
  type ConceptContext, type ConceptType, type QuoteConcept,
} from "./concepts";

type Options = ConceptContext & {
  initialConcepts: QuoteConcept[];
  taxable: boolean;
  /** Imágenes de la cotización: al elegir o quitar un producto se agrega o quita su foto. */
  setImages: Dispatch<SetStateAction<string[]>>;
  /** Fábrica de partidas nuevas (por defecto la de la cotización nueva). */
  createConcept?: (type: ConceptType) => QuoteConcept;
};

/**
 * Estado de las partidas de una cotización: agregar, quitar, editar, elegir producto y totales.
 * Lo comparten la cotización nueva y la edición.
 */
export function useQuoteConcepts({ initialConcepts, taxable, setImages, createConcept = emptyConcept, ...ctx }: Options) {
  const [concepts, setConcepts] = useState<QuoteConcept[]>(initialConcepts);
  const { materials, products, globalCosts, margin, isWholesale } = ctx;

  /** Quita la foto de un producto de la cotización si ninguna otra partida la usa. */
  const dropProductImage = (image: string | null | undefined, exceptId: string) => {
    if (!image) return;
    setImages(prev => {
      const isUsedByOther = concepts.some(c => c.id !== exceptId && c.productImage === image);
      return isUsedByOther ? prev : prev.filter(img => img !== image);
    });
  };

  const addConcept = (type: ConceptType) => {
    setConcepts([...concepts, createConcept(type)]);
  };

  const removeConcept = (id: string) => {
    dropProductImage(concepts.find(c => c.id === id)?.productImage, id);
    setConcepts(concepts.filter(c => c.id !== id));
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- producto de catálogo
  const selectProductForConcept = (conceptId: string, product: any) => {
    const oldProductImage = concepts.find(c => c.id === conceptId)?.productImage || null;
    const newProductImage = product.image || null;
    // Fotos sin duplicados, reemplazando la del producto anterior
    setImages(prev => {
      let next = [...prev];
      const isUsedByOther = concepts.some(c => c.id !== conceptId && c.productImage === oldProductImage);
      if (oldProductImage && !isUsedByOther) next = next.filter(img => img !== oldProductImage);
      if (newProductImage && !next.includes(newProductImage)) next.push(newProductImage);
      return next;
    });
    setConcepts(prev => prev.map(c => (c.id === conceptId ? conceptWithProduct(c, product, ctx) : c)));
  };

  const clearProductForConcept = (conceptId: string) => {
    dropProductImage(concepts.find(c => c.id === conceptId)?.productImage, conceptId);
    setConcepts(prev => prev.map(c => (c.id === conceptId ? conceptWithoutProduct(c) : c)));
  };

  const updateConcept = (id: string, field: string, value: unknown) => {
    setConcepts(prev => prev.map(c => (c.id === id ? updateConceptField(c, field, value, ctx) : c)));
  };

  /** Botón "Recalcular Todo": las partidas de fórmula vuelven al precio sugerido actual. */
  const repriceAll = () => {
    setConcepts(prev => prev.map(c => repriceConcept(c, { materials, products, globalCosts, margin, isWholesale })));
  };

  // Recalcular las partidas cuando de verdad cambia el margen general, el mayoreo, los costos o los materiales.
  // Al abrir una cotización guardada NO se recalcula: se respetan los precios con los que se guardó
  // (antes, solo abrir y guardar la actualizaba a los costos del día). Se compara contra los valores
  // anteriores en vez de "saltar la primera vez" para que el doble montaje de React en desarrollo no la dispare.
  const lastPricingInputs = useRef({ margin, isWholesale, globalCosts, materials });
  useEffect(() => {
    const last = lastPricingInputs.current;
    if (last.margin === margin && last.isWholesale === isWholesale && last.globalCosts === globalCosts && last.materials === materials) return;
    lastPricingInputs.current = { margin, isWholesale, globalCosts, materials };
    if (concepts.length === 0) return;
    setConcepts(prev => prev.map(c => repriceConcept(c, { materials, products, globalCosts, margin, isWholesale })));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo estos cuatro disparan el recálculo
  }, [margin, isWholesale, globalCosts, materials]);

  const totals = useMemo(() => conceptsTotals(concepts, { taxable, globalCosts }), [concepts, globalCosts, taxable]);

  return { concepts, setConcepts, addConcept, removeConcept, selectProductForConcept, clearProductForConcept, updateConcept, repriceAll, totals };
}
