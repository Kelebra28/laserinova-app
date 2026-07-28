import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import NewReceiptForm from "./NewReceiptForm";

export const dynamic = "force-dynamic";

export default async function NewReceiptPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      company: true,
      email: true,
      phone: true,
    }
  });

  const quotes = await prisma.quote.findMany({
    include: {
      client: true,
      concepts: {
        orderBy: { order: "asc" },
        select: {
          description: true,
          quantity: true,
          finalUnitPrice: true,
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  // Convert/cast objects to match expectations if needed
  const sanitizedQuotes = quotes.map(q => ({
    id: q.id,
    folio: q.folio,
    project: q.project,
    description: q.description,
    total: q.total,
    subtotal: q.subtotal,
    taxable: q.taxable,
    status: q.status,
    createdAt: q.createdAt.toISOString(),
    client: q.client ? {
      id: q.client.id,
      name: q.client.name,
      company: q.client.company,
      email: q.client.email,
      phone: q.client.phone,
    } : null,
    prospectName: q.prospectName,
    concepts: q.concepts.map(c => ({
      description: c.description,
      quantity: c.quantity,
      finalUnitPrice: c.finalUnitPrice,
    }))
  }));

  return <NewReceiptForm clients={clients} quotes={sanitizedQuotes} />;
}
