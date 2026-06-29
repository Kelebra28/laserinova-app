import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import EditQuoteForm from "@/components/quotes/EditQuoteForm";
import QuoteVersionTabs from "@/components/quotes/QuoteVersionTabs";

export default async function EditQuotePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const quoteId = params.id;

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      concepts: {
        include: { material: true }
      }
    }
  });

  if (!quote) {
    notFound();
  }

  // Fetch sibling versions if this is part of a group
  let versions = [quote];
  if (quote.versionGroupId) {
    versions = await prisma.quote.findMany({
      where: { versionGroupId: quote.versionGroupId },
      select: { id: true, versionName: true, status: true, total: true, folio: true },
      orderBy: { createdAt: 'asc' }
    }) as any;
  }

  const clients = await prisma.client.findMany({
    where: { active: true },
    orderBy: { name: "asc" }
  });

  const materials = await prisma.material.findMany({
    where: { active: true },
    include: { category: true },
    orderBy: { name: "asc" }
  });

  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { name: "asc" }
  });

  const globalCosts = await prisma.costConfiguration.findMany({
    where: { active: true }
  });

  const globalCostsObj: Record<string, number> = {};
  globalCosts.forEach(c => {
    globalCostsObj[c.key] = c.value;
  });

  const safeGlobals = {
    costo_minuto_mayoreo: globalCostsObj["costo_minuto_mayoreo"] || 8.5,
    costo_minuto_menudeo: globalCostsObj["costo_minuto_menudeo"] || 10,
    porcentaje_iva: globalCostsObj["porcentaje_iva"] || 16,
    factor_guarda_default: globalCostsObj["factor_guarda_default"] || 1.2,
    margen_default: globalCostsObj["margen_default"] || 50,
    factor_produccion_default: globalCostsObj["factor_produccion_default"] || 3,
    precio_tubo: globalCostsObj["precio_tubo"] || 250000,
    vida_util_tubo: globalCostsObj["vida_util_tubo"] || 6000,
    factor_miedo: globalCostsObj["factor_miedo"] || 2,
    porcentaje_transporte_material: globalCostsObj["porcentaje_transporte_material"] || 20,
    porcentaje_merma_corte: globalCostsObj["porcentaje_merma_corte"] || 20,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Editar Cotización <span className="text-red-600">{quote.folio}</span></h1>
      </div>
      
      <QuoteVersionTabs 
        versions={versions} 
        currentQuoteId={quote.id} 
        versionGroupId={quote.versionGroupId} 
      />

      <EditQuoteForm 
        quote={quote} 
        clients={clients} 
        materials={materials} 
        products={products}
        globalCosts={safeGlobals} 
      />
    </div>
  );
}
