import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedDummyProduct() {
  try {
    console.log('Creando producto de prueba...');

    // Asegurarnos de que existe al menos una categoría
    let category = await prisma.productCategory.findFirst();
    if (!category) {
      category = await prisma.productCategory.create({
        data: {
          name: "Accesorios",
          slug: "accesorios",
        }
      });
    }

    // Actualizar el producto A3104 con los nuevos campos técnicos
    const product = await prisma.product.updateMany({
      where: { model: "A3104" },
      data: {
        description: "Termo de acero inoxidable con doble pared al vacío. Diseño ergonómico y tapa hermética antiderrames. Ideal para mantener bebidas calientes por 12 horas o frías por 24 horas. Perfecto para oficina o viajes.",
        material: "Acero Inoxidable / Plástico",
        measurements: "7.5 x 22.5 cm",
        packageType: "Caja de Cartón Individual",
        masterBox: "40 x 40 x 50 cm",
        weight: "350 g",
        printTechniques: "Láser, Serigrafía, Tampografía",
        images: JSON.stringify([
          "https://doblevela.com/images/large/A3104_lrg.jpg",
          "https://doblevela.com/images/large/A2635_lrg.jpg",
          "https://doblevela.com/images/large/A2635_negro_lrg.jpg",
          "https://doblevela.com/images/large/A2104_lrg.jpg"
        ]),
      }
    });

    console.log(`✅ ¡Producto creado con éxito! ID: ${product.id}`);
  } catch (error) {
    console.error('❌ Error al crear producto:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedDummyProduct();
