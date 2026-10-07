import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
async function main() {
  console.log("Iniciando borrado de inventario...");
  
  // Borrar primero los productos (dependen de la categoría)
  const deletedProducts = await prisma.product.deleteMany({});
  console.log(`✅ ${deletedProducts.count} productos eliminados.`);

  // Luego borrar las categorías
  const deletedCategories = await prisma.productCategory.deleteMany({});
  console.log(`✅ ${deletedCategories.count} categorías eliminadas.`);

  console.log("Inventario limpiado exitosamente.");
}

main()
  .catch(e => {
    console.error("Error limpiando inventario:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
