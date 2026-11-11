import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { ProductDetailClient } from "./ProductDetailClient";
import { getCostConfigMap } from "@/lib/pricing/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Detalle de Producto | Laser Inova",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) {
    notFound();
  }

  // Buscar todos los colores de este modelo
  const variants = product.model 
    ? await prisma.product.findMany({ where: { model: product.model } })
    : [product];

  const pricing = await getCostConfigMap();

  return (
    <ProductDetailClient 
      initialProduct={product}
      variants={variants}
      pricing={pricing}
    />
  );
}
