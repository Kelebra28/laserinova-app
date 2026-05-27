import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { getInventoryData } from "./actions";
import InventoryClient from "./InventoryClient";
import { Box } from "lucide-react";
import { prisma } from "@/lib/prisma";

export default async function InventoryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const categories = await getInventoryData();
  
  // Get auto-deduct setting
  const autoDeductSetting = await prisma.costConfiguration.findUnique({
    where: { key: "auto_stock_deduction" }
  });
  const autoDeduct = autoDeductSetting?.value === 1;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-md">
          <Box className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Inventario de Suministros</h1>
          <p className="text-xs text-gray-400 mt-0.5">Control de stock para termos, plumas, llaveros y más</p>
        </div>
      </div>

      <InventoryClient initialCategories={categories} autoDeductInitial={autoDeduct} />
    </div>
  );
}
