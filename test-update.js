const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const parseNum = (val) => {
    if (val === null || val === undefined || val === '') return null;
    const n = Number(val);
    return isNaN(n) ? null : n;
  };

  const project = await prisma.projectRecipe.findFirst({
    where: { name: 'Tarjetas NFC Negras' }
  });

  if (!project) {
    console.log('Project not found');
    return;
  }

  const id = project.id;
  const name = project.name;
  const machineName = project.machineName;
  const rotaryDiameter = "";
  const notes = "Test";
  const steps = [
    { name: "Grabado", power: "30", speed: "1300", frequency: "30", passesCount: "1" },
    { name: "Pulido", power: "60", speed: "1300", frequency: "30", passesCount: "1" }
  ];

  try {
    const projectRecipe = await prisma.$transaction(async (tx) => {
      await tx.projectRecipeStep.deleteMany({
        where: { recipeId: id }
      });

      return tx.projectRecipe.update({
        where: { id },
        data: {
          name,
          machineName,
          rotaryDiameter: parseNum(rotaryDiameter),
          notes,
          steps: {
            create: steps?.map((step, index) => ({
              name: step.name,
              power: parseNum(step.power),
              speed: parseNum(step.speed),
              frequency: parseNum(step.frequency),
              passesCount: parseNum(step.passesCount) || 1,
              order: index,
            })) || []
          }
        },
        include: {
          steps: true
        }
      });
    });
    console.log('Success:', projectRecipe);
  } catch (error) {
    console.error('Error updating:', error);
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
