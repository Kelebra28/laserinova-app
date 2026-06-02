import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import NewQuoteForm from "@/components/quotes/NewQuoteForm";

export const dynamic = "force-dynamic";

export default async function NewQuotePage() {
  const session = await getServerSession(authOptions);
  
  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" },
  });

  const materials = await prisma.material.findMany({
    include: { category: true },
    orderBy: { name: "asc" },
  });

  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  const costConfigs = await prisma.costConfiguration.findMany();
  const globalCosts: Record<string, number> = {};
  costConfigs.forEach(c => {
    globalCosts[c.key] = c.value;
  });

  // Default fallbacks in case DB is not fully populated
  const safeGlobals = {
    costo_minuto_mayoreo: globalCosts["costo_minuto_mayoreo"] || 8.5,
    costo_minuto_menudeo: globalCosts["costo_minuto_menudeo"] || 10,
    porcentaje_iva: globalCosts["porcentaje_iva"] || 16,
    factor_guarda_default: globalCosts["factor_guarda_default"] || 1.2,
    margen_default: globalCosts["margen_default"] || 50,
    factor_produccion_default: globalCosts["factor_produccion_default"] || 3,
    precio_tubo: globalCosts["precio_tubo"] || 250000,
    vida_util_tubo: globalCosts["vida_util_tubo"] || 6000,
    factor_miedo: globalCosts["factor_miedo"] || 2,
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Crear Cotización</h1>
      <NewQuoteForm 
        clients={clients} 
        materials={materials} 
        products={products}
        globalCosts={safeGlobals} 
        userId={(session?.user as any)?.id} 
      />
    </div>
  );
}
