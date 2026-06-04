import { prisma } from "@/lib/prisma";
import { Cpu, Settings2 } from "lucide-react";
import ProcessTabs from "./ProcessTabs";

export default async function ProcessesPage() {
  const processes = await prisma.machineProcess.findMany({
    orderBy: { createdAt: "desc" }
  });

  const projectRecipes = await prisma.projectRecipe.findMany({
    orderBy: { createdAt: "desc" },
    include: { steps: { orderBy: { order: "asc" } } }
  });

  const materials = await prisma.material.findMany({
    where: { active: true },
    select: { 
      categoryId: true,
      category: { select: { name: true } },
      thickness: true 
    },
    distinct: ['categoryId', 'thickness'],
    orderBy: { category: { name: 'asc' } }
  });

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Cpu className="h-6 w-6 text-red-600" />
            PROCESOS DE MÁQUINAS
          </h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
            Configuraciones y recetas de grabado/corte
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <ProcessTabs initialProcesses={processes} projectRecipes={projectRecipes} materials={materials} />
      </div>
    </div>
  );
}
