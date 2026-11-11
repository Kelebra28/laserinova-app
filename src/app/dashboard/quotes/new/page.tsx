import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import NewQuoteForm from "@/components/quotes/NewQuoteForm";
import { getGlobalCosts } from "@/lib/pricing/server";

export const dynamic = "force-dynamic";

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = await searchParams;
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
    include: { category: true },
    orderBy: { name: "asc" },
  });

  const safeGlobals = await getGlobalCosts();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Crear Cotización</h1>
      <NewQuoteForm 
        clients={clients} 
        materials={materials} 
        products={products}
        globalCosts={safeGlobals} 
        userId={(session?.user as any)?.id}
        initialData={resolvedParams}
      />
    </div>
  );
}
