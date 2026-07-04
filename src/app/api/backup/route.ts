import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // Fetch all tables
    const [
      users,
      clients,
      quotes,
      quoteConcepts,
      materials,
      products,
      transactions,
      tasks
    ] = await Promise.all([
      prisma.user.findMany(),
      prisma.client.findMany(),
      prisma.quote.findMany(),
      prisma.quoteConcept.findMany(),
      prisma.material.findMany(),
      prisma.product.findMany(),
      prisma.financialTransaction.findMany(),
      prisma.task.findMany(),
    ]);

    const backupData = {
      timestamp: new Date().toISOString(),
      data: {
        users,
        clients,
        quotes,
        quoteConcepts,
        materials,
        products,
        transactions,
        tasks
      }
    };

    return new NextResponse(JSON.stringify(backupData, null, 2), {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="backup-laserinova-${new Date().toISOString().split('T')[0]}.json"`,
        "Content-Type": "application/json"
      }
    });

  } catch (error) {
    console.error("Backup error:", error);
    return NextResponse.json({ error: "Error generando el respaldo" }, { status: 500 });
  }
}
