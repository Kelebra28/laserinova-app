import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PaymentRequestsClient from "@/components/payments/PaymentRequestsClient";

export const metadata: Metadata = {
  title: "Solicitudes de Pago | CRM Laser Inova",
};

export default async function PaymentRequestsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signin");
  }

  // Fetch clients to pass to the form
  const clients = await prisma.client.findMany({
    where: { active: true },
    select: { id: true, name: true, company: true },
    orderBy: { name: "asc" }
  });

  // Fetch existing payment requests
  const requests = await prisma.paymentRequest.findMany({
    include: {
      quote: { select: { folio: true, project: true } },
      client: { select: { name: true, company: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="py-6 sm:py-8 lg:py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <PaymentRequestsClient initialRequests={requests} clients={clients} />
    </div>
  );
}
