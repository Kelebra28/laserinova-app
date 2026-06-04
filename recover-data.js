const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const project = await prisma.projectRecipe.findFirst({
    where: { name: 'Tarjetas NFC Negras' },
    include: { steps: true }
  });

  if (project) {
    if (project.steps.length === 0) {
      console.log('Restoring steps for Tarjetas NFC Negras');
      await prisma.projectRecipeStep.createMany({
        data: [
          { recipeId: project.id, name: 'Grabado', power: 30, speed: 1300, frequency: null, order: 0 },
          { recipeId: project.id, name: 'Pulido', power: 60, speed: 1300, frequency: null, order: 1 }
        ]
      });
      console.log('Restored.');
    } else {
      console.log('Steps still exist, no need to restore.');
    }
  } else {
    console.log('Project not found, creating from scratch.');
    await prisma.projectRecipe.create({
      data: {
        name: 'Tarjetas NFC Negras',
        machineName: 'FIBRA',
        steps: {
          create: [
            { name: 'Grabado', power: 30, speed: 1300, frequency: null, order: 0 },
            { name: 'Pulido', power: 60, speed: 1300, frequency: null, order: 1 }
          ]
        }
      }
    });
    console.log('Created project and steps.');
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
