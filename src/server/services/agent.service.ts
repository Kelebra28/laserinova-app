import { prisma } from "@/lib/prisma";
import { calculateConcept } from "@/lib/calculations";

export async function createClientService(nombre: string, telefono?: string) {
  return await prisma.client.create({ 
    data: { name: nombre, phone: telefono || null, active: true } 
  });
}

export async function createQuoteService(nombre_cliente: string, userId: string, conceptos: any[]) {
  const client = await prisma.client.findFirst({ where: { name: { contains: nombre_cliente } } });
  if (!client) throw new Error(`No se encontró un cliente con el nombre "${nombre_cliente}".`);

  // Traer configuración global para los cálculos
  const configs = await prisma.costConfiguration.findMany();
  const globals = configs.reduce((acc: any, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {});

  let granTotal = 0;
  let conceptosAInsertar = [];

  // Procesar cada concepto matemáticamente
  for (let i = 0; i < conceptos.length; i++) {
    const conc = conceptos[i];
    const material = await prisma.material.findFirst({
      where: { 
        name: { contains: conc.material_nombre },
        ...(conc.grosor_mm ? { thickness: conc.grosor_mm } : {}) 
      }
    });

    const inputData = {
      type: "CORTE" as const,
      quantity: 1,
      material: material ? {
        id: material.id,
        pricePerCm2: material.pricePerCm2,
        sheetPrice: material.sheetPrice,
        length: material.length,
        width: material.width,
        guardPercentage: material.guardPercentage
      } : undefined,
      clientProvidesMaterial: false,
      partWidth: conc.ancho_cm,
      partHeight: conc.alto_cm,
      timeMin: conc.minutos_corte
    };

    const calcResult = calculateConcept(inputData, globals);
    
    conceptosAInsertar.push({
      conceptType: "CORTE",
      description: `Corte Láser en ${material ? material.name : conc.material_nombre} (${conc.ancho_cm}x${conc.alto_cm}cm)`,
      quantity: 1,
      materialId: material?.id,
      width: conc.ancho_cm,
      height: conc.alto_cm,
      thickness: conc.grosor_mm,
      cutTime: conc.minutos_corte,
      materialCost: calcResult.materialCost,
      productionCost: calcResult.productionCost,
      realCost: calcResult.realCost,
      suggestedPrice: calcResult.suggestedPrice,
      finalUnitPrice: calcResult.suggestedPrice,
      totalAmount: calcResult.suggestedPrice,
      order: i
    });

    granTotal += calcResult.suggestedPrice;
  }

  const newQuote = await prisma.quote.create({
    data: {
      clientId: client.id, 
      userId: userId,
      folio: `AG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      project: `Cotización IA - ${conceptos.length} opciones`,
      total: granTotal, 
      status: "DRAFT",
      concepts: {
        create: conceptosAInsertar
      }
    },
    include: {
      concepts: true
    }
  });

  return newQuote;
}

export async function calculateCutPriceService(material_nombre: string, ancho_cm: number, alto_cm: number, minutos_corte?: number, grosor_mm?: number) {
  const material = await prisma.material.findFirst({
    where: { 
      name: { contains: material_nombre },
      ...(grosor_mm ? { thickness: grosor_mm } : {}) 
    }
  });

  const configs = await prisma.costConfiguration.findMany();
  const globals = configs.reduce((acc: any, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {});

  const inputData = {
    type: "CORTE" as const,
    quantity: 1,
    material: material ? {
      pricePerCm2: material.pricePerCm2,
      sheetPrice: material.sheetPrice,
      length: material.length,
      width: material.width,
      guardPercentage: material.guardPercentage
    } : undefined,
    clientProvidesMaterial: false,
    partWidth: ancho_cm,
    partHeight: alto_cm,
    timeMin: minutos_corte
  };
  
  const calcResult = calculateConcept(inputData, globals);

  return {
    area_cm2: ancho_cm * alto_cm,
    materialBaseCost: calcResult.materialBaseCost,
    materialWastageCost: calcResult.materialWastageCost,
    materialCost: calcResult.materialCost,
    productionCost: calcResult.productionCost,
    realCost: calcResult.realCost,
    suggestedPrice: calcResult.suggestedPrice,
    nota: material ? `Se usó el material '${material.name}' y las fórmulas exactas del CRM.` : "Material no encontrado, cálculo puede ser impreciso."
  };
}
