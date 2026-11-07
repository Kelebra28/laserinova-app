import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { colorLabel, guardPublicApi, modelForSlug, publicCategorySlugs } from "@/lib/public-api";

/**
 * Solicitud de cotización desde la tienda web (carrito → "Solicitar cotización").
 *
 * Crea: el Cliente (prospecto) si no existe + una Cotización en BORRADOR con un concepto RESALE por producto.
 * Los precios quedan en 0: la cotización la completa ventas. El folio es WEB-AAAA-NNNN (serie propia, no choca con LI-/LIA-).
 *
 * Responsables: PUBLIC_QUOTE_USER_IDS (ids separados por coma). Las solicitudes se reparten POR TURNOS entre ellos
 * (la 1.ª al primero, la 2.ª al segundo, y así). Está APAGADO mientras esa variable no exista: responde 503 y no escribe
 * nada en la base.
 */

const MAX_ITEMS = 40;
const MAX_QTY = 1_000_000;
const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

async function nextFolio(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `WEB-${year}-`;
  const last = await prisma.quote.findFirst({ where: { folio: { startsWith: prefix } }, orderBy: { folio: "desc" }, select: { folio: true } });
  const n = last ? parseInt(last.folio.slice(prefix.length), 10) : 0;
  return `${prefix}${String((Number.isFinite(n) ? n : 0) + 1).padStart(4, "0")}`;
}

export async function POST(request: Request) {
  const denied = guardPublicApi(request);
  if (denied) return denied;

  const ownerIds = (process.env.PUBLIC_QUOTE_USER_IDS ?? process.env.PUBLIC_QUOTE_USER_ID ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const slugs = publicCategorySlugs();
  if (!ownerIds.length || !slugs.length) return NextResponse.json({ error: "No disponible" }, { status: 503 });

  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 30_000) return NextResponse.json({ error: "Solicitud demasiado grande" }, { status: 413 });
    body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("formato");
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const name = str(body.name, 120);
  const company = str(body.company, 150);
  const email = str(body.email, 150).toLowerCase();
  const phone = str(body.phone, 30).replace(/[^\d+()\-\s.]/g, "");
  const notes = str(body.notes, 600);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const phoneOk = phone.replace(/\D/g, "").length >= 8;
  const rawItems = Array.isArray(body.items) ? body.items : [];
  if (!name || (!emailOk && !phoneOk) || rawItems.length < 1 || rawItems.length > MAX_ITEMS) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 422 });
  }

  // Responsables activos, en el orden configurado; la solicitud le toca al siguiente en el turno.
  const found = await prisma.user.findMany({ where: { id: { in: ownerIds }, active: true }, select: { id: true, name: true } });
  const owners = ownerIds.map((id) => found.find((u) => u.id === id)).filter((u): u is { id: string; name: string } => !!u);
  if (!owners.length) return NextResponse.json({ error: "No disponible" }, { status: 503 });
  const taken = await prisma.quote.count({ where: { folio: { startsWith: "WEB-" } } });
  const owner = owners[taken % owners.length];

  // Cada producto debe existir en el catálogo público; la cantidad se valida. Nada de lo que mande el navegador se confía.
  const concepts: { description: string; details: string | null; quantity: number; productId: string }[] = [];
  for (const it of rawItems as Record<string, unknown>[]) {
    const slug = str(it?.slug, 80);
    const qty = Math.floor(Number(it?.qty));
    const color = it?.color ? str(it.color, 60).toUpperCase() : null;
    if (!/^[a-z0-9-]{1,80}$/.test(slug) || !Number.isFinite(qty) || qty < 1 || qty > MAX_QTY) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 422 });
    }
    const model = await modelForSlug(slug, slugs);
    if (!model) return NextResponse.json({ error: "Producto no disponible" }, { status: 422 });
    const rows = await prisma.product.findMany({
      where: { active: true, model: { equals: model }, category: { active: true, slug: { in: slugs } } },
      select: { id: true, name: true, color: true },
      orderBy: { color: "asc" },
    });
    if (!rows.length) return NextResponse.json({ error: "Producto no disponible" }, { status: 422 });
    const row = (color && rows.find((r) => r.color && colorLabel(r.color).toUpperCase() === color)) || rows[0];
    concepts.push({
      description: row.name,
      details: color ? `Color solicitado: ${color.charAt(0) + color.slice(1).toLowerCase()}` : "Color por definir",
      quantity: qty,
      productId: row.id,
    });
  }

  // Cliente (prospecto): se reutiliza si ya existe por correo o teléfono.
  const digits = phone.replace(/\D/g, "");
  let client = emailOk ? await prisma.client.findFirst({ where: { email, active: true } }) : null;
  if (!client && phoneOk) client = await prisma.client.findFirst({ where: { phone: { contains: digits.slice(-10) }, active: true } });
  if (!client) {
    client = await prisma.client.create({
      data: { name, company: company || null, email: emailOk ? email : null, phone: phoneOk ? phone : null, notes: "Origen: tienda web (solicitud de cotización)." },
    });
  }

  const contact = [`Nombre: ${name}`, company && `Empresa: ${company}`, phoneOk && `Teléfono: ${phone}`, emailOk && `Correo: ${email}`].filter(Boolean).join("\n");
  for (let attempt = 0; attempt < 3; attempt++) {
    const folio = await nextFolio();
    try {
      await prisma.quote.create({
        data: {
          folio,
          clientId: client.id,
          userId: owner.id,
          prospectName: name,
          project: `Solicitud web — ${concepts.length} ${concepts.length === 1 ? "producto" : "productos"}`,
          description: notes || null,
          status: "DRAFT",
          internalNotes: `SOLICITUD DESDE LA TIENDA WEB (sin precios: pendiente de cotizar)\n${contact}${notes ? `\nComentarios: ${notes}` : ""}`,
          concepts: {
            create: concepts.map((c, order) => ({ conceptType: "RESALE", description: c.description, details: c.details, quantity: c.quantity, productId: c.productId, order })),
          },
        },
      });
      return NextResponse.json({ ok: true, folio, assignedTo: owner.name }, { status: 201 });
    } catch (e) {
      if ((e as { code?: string })?.code !== "P2002") {
        console.error("[quote-requests] no se pudo crear la cotización", e);
        return NextResponse.json({ error: "No se pudo registrar" }, { status: 500 });
      }
      // folio repetido por dos solicitudes simultáneas: se reintenta con el siguiente
    }
  }
  return NextResponse.json({ error: "No se pudo registrar" }, { status: 500 });
}
