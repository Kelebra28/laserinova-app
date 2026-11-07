import { NextResponse } from "next/server";
import { cacheHeaders, getPublicCategories, guardPublicApi, publicCategorySlugs } from "@/lib/public-api";

export async function GET(request: Request) {
  const denied = guardPublicApi(request);
  if (denied) return denied;
  const slugs = publicCategorySlugs();
  if (!slugs.length) return NextResponse.json({ categories: [] }, { headers: cacheHeaders });
  return NextResponse.json({ categories: await getPublicCategories(slugs) }, { headers: cacheHeaders });
}
