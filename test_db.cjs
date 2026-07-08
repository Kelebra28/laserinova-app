const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const configs = await prisma.costConfiguration.findMany();
  const globals = {};
  configs.forEach(c => {
    globals[c.key] = c.value;
  });
  
  const tubePrice = Number(globals.precio_tubo) || 15000;
  const tubeLifeHours = Number(globals.vida_util_tubo) || 10000;
  const fearFactor = Number(globals.factor_miedo) || 2;
  const prodFactor = Number(globals.factor_produccion_default) || 3;
  const transportFactor = Number(globals.porcentaje_transporte_material) ? (1 + Number(globals.porcentaje_transporte_material) / 100) : 1.15;
  const mermaPercent = Number(globals.porcentaje_merma_corte) ? (Number(globals.porcentaje_merma_corte) / 100) : 0.20;
  
  // input
  const partWidth = 9;
  const partHeight = 6;
  const timeMin = 2; // For one piece?? Or total time??
  const quantity = 180;
  
  // Let's assume pricePerCm2 for Acrilico Cristal 3mm is 0.08
  const pricePerCm2 = 0.08;
  const baseSinNada = pricePerCm2 / 1.2;
  const purePriceCm2 = baseSinNada * transportFactor;
  
  const areaPieza = partWidth * partHeight;
  const materialBaseCost = areaPieza * purePriceCm2;
  const materialWastageCost = materialBaseCost * mermaPercent;
  const materialCost = materialBaseCost + materialWastageCost;
  
  const totalTime = timeMin;
  const baseMinCost = (tubePrice / tubeLifeHours) / 60;
  const pureCutCost = totalTime * baseMinCost;
  const productionCost = pureCutCost * fearFactor * prodFactor;
  
  const realCost = materialCost + productionCost;
  console.log({
    materialBaseCost,
    materialWastageCost,
    materialCost,
    productionCost,
    realCost,
    baseMinCost,
    pureCutCost
  });
}
main().catch(console.error).finally(() => prisma.$disconnect());
