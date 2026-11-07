import { NextResponse } from "next/server";
import { cacheHeaders, getAllPublicProducts, guardPublicApi, publicCategorySlugs } from "@/lib/public-api";

export async function GET(request: Request) {
  const denied = guardPublicApi(request);
  if (denied) return denied;
  const slugs = publicCategorySlugs();
  if (!slugs.length) return NextResponse.json({ products: [], total: 0 }, { headers: cacheHeaders });

  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(60, Math.max(1, Number(url.searchParams.get("limit")) || 24));
  if (category && !slugs.includes(category)) return NextResponse.json({ products: [], total: 0 }, { headers: cacheHeaders });

  // Sale de la copia en memoria (1 lectura a la base cada 10 min), no de una consulta por página.
  const everything = await getAllPublicProducts(slugs);
  const all = category ? everything.filter((p) => p.category.slug === category) : everything;
  return NextResponse.json(
    { products: all.slice((page - 1) * limit, page * limit), total: all.length, page, limit },
    { headers: cacheHeaders },
  );
}
