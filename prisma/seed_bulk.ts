import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const categories = [
  "MDF",
  "Acrílico",
  "Bicapa / Bicolam",
  "Espejo",
  "Maderas y Chapas",
  "Metales y Alucobond",
  "Plásticos y Otros",
  "ABS",
];

const materialsData = [
  // MDF
  { category: "MDF", name: "MDF 2.5mm", length: 240, width: 120, thickness: 2.5, sheetPrice: 146, guardPercentage: 1.2 },
  { category: "MDF", name: "MDF 3mm", length: 240, width: 120, thickness: 3, sheetPrice: 165, guardPercentage: 1.2 },
  { category: "MDF", name: "MDF 4.5mm", length: 240, width: 120, thickness: 4.5, sheetPrice: 204, guardPercentage: 1.2 },
  { category: "MDF", name: "MDF 5.5mm", length: 240, width: 120, thickness: 5.5, sheetPrice: 234, guardPercentage: 1.2 },
  { category: "MDF", name: "MDF 6mm", length: 240, width: 120, thickness: 6, sheetPrice: 201, guardPercentage: 1.2 },
  { category: "MDF", name: "MDF 9mm", length: 240, width: 120, thickness: 9, sheetPrice: 344, guardPercentage: 1.2 },
  { category: "MDF", name: "MDF 12mm", length: 240, width: 120, thickness: 12, sheetPrice: 410, guardPercentage: 1.2 },
  { category: "MDF", name: "MDF 1 Cara Blanca 6mm", length: 240, width: 120, thickness: 6, sheetPrice: 270, guardPercentage: 1.2 },
  
  // Acrílicos Cristal
  { category: "Acrílico", name: "Acrílico Cristal 1.5mm", length: 180, width: 120, thickness: 1.5, sheetPrice: 1140, guardPercentage: 1.2 },
  { category: "Acrílico", name: "Acrílico Cristal 2mm", length: 240, width: 120, thickness: 2, sheetPrice: 1380, guardPercentage: 1.2 },
  { category: "Acrílico", name: "Acrílico Cristal 3mm", length: 240, width: 120, thickness: 3, sheetPrice: 1730, guardPercentage: 1.2 },
  { category: "Acrílico", name: "Acrílico Cristal 4mm", length: 130, width: 90, thickness: 4, sheetPrice: 1100, guardPercentage: 1.2 },
  { category: "Acrílico", name: "Acrílico Cristal 5mm", length: 240, width: 120, thickness: 5, sheetPrice: 2753, guardPercentage: 1.2 },
  { category: "Acrílico", name: "Acrílico Cristal 6mm", length: 240, width: 120, thickness: 6, sheetPrice: 3350, guardPercentage: 1.2 },
  { category: "Acrílico", name: "Acrílico Cristal 9mm", length: 240, width: 120, thickness: 9, sheetPrice: 5568, guardPercentage: 1.2 },
  { category: "Acrílico", name: "Acrílico Cristal 12mm", length: 240, width: 120, thickness: 12, sheetPrice: 7430, guardPercentage: 1.2 },

  // Acrílicos Sólidos
  { category: "Acrílico", name: "Acrílico Negro Sólido 3mm", length: 100, width: 100, thickness: 3, sheetPrice: 740, guardPercentage: 1.2 },
  { category: "Acrílico", name: "Acrílico Negro Sólido 6mm", length: 100, width: 100, thickness: 6, sheetPrice: 1430, guardPercentage: 1.2 },
  { category: "Acrílico", name: "Acrílico Negro Sólido 9mm", length: 240, width: 120, thickness: 9, sheetPrice: 6091, guardPercentage: 1.2 },
  { category: "Acrílico", name: "Acrílico Blanco Sólido 3mm", length: 240, width: 120, thickness: 3, sheetPrice: 1816, guardPercentage: 1.2 },
  { category: "Acrílico", name: "Acrílico Blanco Sólido 6mm", length: 240, width: 120, thickness: 6, sheetPrice: 3507, guardPercentage: 1.2 },
  { category: "Acrílico", name: "Acrílico Blanco Sólido 9mm", length: 240, width: 120, thickness: 9, sheetPrice: 5815, guardPercentage: 1.2 },
  { category: "Acrílico", name: "Acrílico Opalina 3mm", length: 240, width: 120, thickness: 3, sheetPrice: 1730, guardPercentage: 1.2 },
  { category: "Acrílico", name: "Acrílico Opalina 6mm", length: 240, width: 120, thickness: 6, sheetPrice: 3340, guardPercentage: 1.2 },

  // Espejos
  { category: "Espejo", name: "Espejo Vidrio 4mm", length: 240, width: 120, thickness: 4, sheetPrice: 500, guardPercentage: 1.2 },
  { category: "Espejo", name: "Acrílico Espejo Plata 3mm", length: 240, width: 120, thickness: 3, sheetPrice: 2420, guardPercentage: 1.2 },
  { category: "Espejo", name: "Acrílico Espejo Oro 3mm", length: 240, width: 120, thickness: 3, sheetPrice: 2420, guardPercentage: 1.2 },
  { category: "Espejo", name: "Acrílico Espejo Rojo 3mm", length: 100, width: 100, thickness: 3, sheetPrice: 966, guardPercentage: 1.2 },

  // Bicapa / Bicolam
  { category: "Bicapa / Bicolam", name: "Bicapa Oro/Negro 1.5mm", length: 120, width: 60, thickness: 1.5, sheetPrice: 575, guardPercentage: 1.2 },
  { category: "Bicapa / Bicolam", name: "Bicapa Plata/Negro 1.6mm", length: 120, width: 60, thickness: 1.6, sheetPrice: 1300, guardPercentage: 1.2 },
  { category: "Bicapa / Bicolam", name: "Bicolam Oro/Negro 1.5mm", length: 120, width: 60, thickness: 1.5, sheetPrice: 575, guardPercentage: 1.2 },

  // Maderas y Chapas
  { category: "Maderas y Chapas", name: "Triplay 3mm", length: 240, width: 120, thickness: 3, sheetPrice: 180, guardPercentage: 1.2 },
  { category: "Maderas y Chapas", name: "Triplay 6mm", length: 240, width: 120, thickness: 6, sheetPrice: 256, guardPercentage: 1.2 },
  { category: "Maderas y Chapas", name: "Triplay 9mm", length: 240, width: 120, thickness: 9, sheetPrice: 390, guardPercentage: 1.2 },
  { category: "Maderas y Chapas", name: "Chapa Bambú 0.4mm", length: 240, width: 45, thickness: 0.4, sheetPrice: 162, guardPercentage: 1.2 },
  { category: "Maderas y Chapas", name: "Chapa Nogal 0.6mm", length: 240, width: 120, thickness: 0.6, sheetPrice: 246, guardPercentage: 1.2 },
  { category: "Maderas y Chapas", name: "Pino 9mm", length: 240, width: 120, thickness: 9, sheetPrice: 375, guardPercentage: 1.2 },
  { category: "Maderas y Chapas", name: "Encino 9mm", length: 240, width: 120, thickness: 9, sheetPrice: 515, guardPercentage: 1.2 },
  { category: "Maderas y Chapas", name: "Sapelli 9mm", length: 240, width: 120, thickness: 9, sheetPrice: 345, guardPercentage: 1.2 },

  // Metales
  { category: "Metales y Alucobond", name: "Alucobond Blanco", length: 240, width: 120, thickness: 3, sheetPrice: 1697, guardPercentage: 1.2 },
  { category: "Metales y Alucobond", name: "Alucobond Plateado", length: 240, width: 120, thickness: 3, sheetPrice: 1973, guardPercentage: 1.2 },
  
  // Plásticos y Otros
  { category: "Plásticos y Otros", name: "PET 0.5mm", length: 120, width: 120, thickness: 0.5, sheetPrice: 250, guardPercentage: 1.2 },
  { category: "Plásticos y Otros", name: "Cartón Corrugado", length: 102, width: 76, thickness: 0, sheetPrice: 64, guardPercentage: 1.2 },
  { category: "Plásticos y Otros", name: "Cartulina 18pts", length: 125, width: 90, thickness: 0, sheetPrice: 50, guardPercentage: 1.2 },
];

async function main() {
  const catMap = new Map();
  for (const catName of categories) {
    let cat = await prisma.materialCategory.findFirst({ where: { name: catName } });
    if (!cat) {
      cat = await prisma.materialCategory.create({ 
        data: { 
          name: catName,
          slug: catName.toLowerCase().replace(/[\s/]+/g, '-').replace(/[^a-z0-9-]/g, '')
        } 
      });
    }
    catMap.set(catName, cat.id);
  }

  for (const mat of materialsData) {
    const categoryId = catMap.get(mat.category);
    if (!categoryId) continue;

    // Calculamos precio con guarda y precio por cm2 base
    const areaCm2 = mat.length * mat.width;
    const productionPrice = mat.sheetPrice * mat.guardPercentage;
    const pricePerCm2 = areaCm2 > 0 ? productionPrice / areaCm2 : 0;

    const existing = await prisma.material.findFirst({ where: { name: mat.name } });
    if (!existing) {
      await prisma.material.create({
        data: {
          categoryId,
          name: mat.name,
          length: mat.length,
          width: mat.width,
          thickness: mat.thickness,
          sheetPrice: mat.sheetPrice,
          guardPercentage: mat.guardPercentage,
          productionPrice,
          pricePerCm2,
        }
      });
    }
  }

  const configs = [
    { key: "costo_minuto_mayoreo", name: "Costo Minuto Mayoreo", value: 8.5 },
    { key: "costo_minuto_menudeo", name: "Costo Minuto Menudeo", value: 10 },
    { key: "dias_laborables_mes", name: "Días Laborables al Mes", value: 22 },
    { key: "horas_maquina_dia", name: "Horas Máquina por Día", value: 5 },
  ];

  for (const config of configs) {
    await prisma.costConfiguration.upsert({
      where: { key: config.key },
      update: { value: config.value },
      create: { key: config.key, name: config.name, value: config.value }
    });
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
