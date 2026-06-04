const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const steps = await prisma.projectRecipeStep.findMany({
    where: { name: 'Corte' },
    include: { recipe: true }
  });

  for (const step of steps) {
    if (step.recipe.name === 'Tarjetas NFC Negras') {
      await prisma.projectRecipeStep.update({
        where: { id: step.id },
        data: { name: 'Pulido' }
      });
      console.log('Fixed Corte -> Pulido');
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
