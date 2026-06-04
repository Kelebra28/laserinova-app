const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const recipes = await prisma.projectRecipe.findMany({
    where: { name: '' }
  });

  for (const recipe of recipes) {
    if (recipe.notes && recipe.notes.includes('Tarjetas NFC')) {
      await prisma.projectRecipe.update({
        where: { id: recipe.id },
        data: { name: 'Tarjetas NFC Negras' }
      });
      console.log('Fixed recipe name for Tarjetas NFC');
    } else {
      await prisma.projectRecipe.update({
        where: { id: recipe.id },
        data: { name: 'Proyecto sin nombre' }
      });
      console.log('Fixed recipe name to generic');
    }
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
