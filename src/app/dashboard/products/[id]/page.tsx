import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getDobleVelaStock } from "@/server/services/doblevela.service";
import Link from "next/link";
import { ArrowLeft, Box, DollarSign, Tag, Info } from "lucide-react";
import { Metadata } from "next";
import { ProductDetailClient } from "./ProductDetailClient";

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

  // Consultar stock en vivo si es de Doble Vela
  let liveStock = null;
  let isLive = false;

  if (product.provider === "Doble Vela" && product.model) {
    liveStock = await getDobleVelaStock(product.model);
    isLive = true;
  }

  // Si tenemos precio en vivo, lo usamos; si no, caemos al de BD
  const displayPrice = isLive && liveStock ? liveStock.precioCosto : product.unitPrice;

  return (
    <ProductDetailClient 
      initialProduct={product}
      variants={variants}
      liveStockData={liveStock}
    />
  );
}
