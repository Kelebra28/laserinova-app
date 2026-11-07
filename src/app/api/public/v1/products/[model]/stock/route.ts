import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { colorLabel, guardPublicApi, modelForSlug, publicCategorySlugs, showStock } from "@/lib/public-api";
import { getLiveCdmxStock } from "@/server/services/doblevela.service";

const noStore = { "Cache-Control": "private, no-store" };

/**
 * Existencia de UN producto, en vivo cuando se puede (solo Doble Vela, método GetExistencia de un modelo, que su
 * documentación recomienda al abrir el detalle). Si no se puede (otro proveedor, sin cupo o Doble Vela no responde)
 * devuelve lo que hay en la BD con `live: false`. Nunca se consulta el catálogo completo.
 */
export async function GET(request: Request, ctx: { params: Promise<{ model: string }> }) {
  const denied = guardPublicApi(request);
  if (denied) return denied;
  const slugs = publicCategorySlugs();
  const { model: slug } = await ctx.params;
  if (!showStock() || !slugs.length || slug.length > 80) return NextResponse.json({ error: "No disponible" }, { status: 404 });

  const real = await modelForSlug(slug, slugs);
  if (!real) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const rows = await prisma.product.findMany({
    where: { active: true, model: { equals: real }, category: { active: true, slug: { in: slugs } } },
    select: { color: true, stockQuantity: true, provider: true },
    orderBy: { color: "asc" },
  });
  if (!rows.length) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const pieces = (n: number) => Math.max(0, Math.floor(Number.isFinite(n) ? n : 0));
  const live = rows[0].provider === "Doble Vela" ? await getLiveCdmxStock(real) : null;

  const colors = rows
    .filter((r) => r.color)
    .map((r) => {
      const name = colorLabel(r.color!);
      const fromLive = live?.get(name.toUpperCase());
      return { name, stock: fromLive !== undefined ? fromLive : pieces(r.stockQuantity) };
    });
  const total = rows.some((r) => r.color) ? colors.reduce((n, c) => n + c.stock, 0) : rows.reduce((n, r) => n + pieces(r.stockQuantity), 0);

  return NextResponse.json({ live: !!live, total, colors }, { headers: noStore });
}
