import { NextResponse } from "next/server";
import { cacheHeaders, getAllPublicProducts, guardPublicApi, publicCategorySlugs } from "@/lib/public-api";

export async function GET(request: Request, ctx: { params: Promise<{ model: string }> }) {
  const denied = guardPublicApi(request);
  if (denied) return denied;
  const { model } = await ctx.params;
  const slugs = publicCategorySlugs();
  if (!slugs.length || model.length > 80) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // `model` llega como slug ("tmps-195"). Se busca en la copia en memoria: no toca la base.
  const wanted = model.toLowerCase();
  const product = (await getAllPublicProducts(slugs)).find((p) => p.slug === wanted);
  if (!product) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ product }, { headers: cacheHeaders });
}
