const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const oldProcesses = await prisma.machineProcess.findMany({
    where: {
      machineName: { in: ['FIBRA', 'UV', 'FIBRA ÓPTICA'] }
    }
  });

  console.log(`Found ${oldProcesses.length} old processes to migrate.`);

  for (const proc of oldProcesses) {
    // Determine machineName (UI uses "FIBRA" for "FIBRA ÓPTICA" activeTab)
    const machineName = proc.machineName === 'FIBRA ÓPTICA' ? 'FIBRA' : proc.machineName;

    // Create a new ProjectRecipe
    const newRecipe = await prisma.projectRecipe.create({
      data: {
        name: proc.material, // The old UI used material as the main identifier
        machineName: machineName,
        notes: proc.notes,
        active: proc.active,
        createdAt: proc.createdAt,
        updatedAt: proc.updatedAt,
      }
    });

    console.log(`Created ProjectRecipe: ${newRecipe.name}`);

    let order = 0;

    // Create steps if they exist
    // Usually, the old system had engraveSpeed/Power and cutSpeed/Power
    if (proc.engraveSpeed || proc.engravePower || proc.engraveFrequency) {
      await prisma.projectRecipeStep.create({
        data: {
          recipeId: newRecipe.id,
          name: 'Grabado',
          speed: proc.engraveSpeed,
          power: proc.engravePower,
          frequency: proc.engraveFrequency,
          order: order++
        }
      });
      console.log(`  Added step: Grabado`);
    }

    if (proc.cutSpeed || proc.cutPower) {
      await prisma.projectRecipeStep.create({
        data: {
          recipeId: newRecipe.id,
          name: 'Corte',
          speed: proc.cutSpeed,
          power: proc.cutPower,
          frequency: null, // old cut didn't have frequency
          order: order++
        }
      });
      console.log(`  Added step: Corte`);
    }

    // Optional: Delete the old process if we want to clean up, but let's keep it just in case
    // await prisma.machineProcess.delete({ where: { id: proc.id } });
  }

  console.log('Migration complete.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
