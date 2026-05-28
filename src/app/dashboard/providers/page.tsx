import React from "react";
import { prisma } from "@/lib/prisma";
import ProvidersClient from "@/components/providers/ProvidersClient";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Directorio de Proveedores | CRM Laser Inova",
  description: "Directorio interactivo de proveedores y portales de acceso para Laser Inova CRM",
};

export default async function ProvidersPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/login");
  }

  // Obtener los proveedores activos con sus contactos de atención
  const initialProviders = await prisma.provider.findMany({
    where: { active: true },
    include: {
      contacts: true,
    },
    orderBy: {
      companyName: "asc",
    },
  });

  return (
    <div className="p-1">
      <ProvidersClient initialProviders={initialProviders} />
    </div>
  );
}
