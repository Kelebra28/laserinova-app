import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const projectRecipe = await prisma.projectRecipe.delete({
      where: {
        id,
      },
    });

    return NextResponse.json(projectRecipe);
  } catch (error) {
    console.error("[PROJECT_RECIPE_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, machineName, rotaryDiameter, notes, steps } = body;

    const parseNum = (val: any) => {
      if (val === null || val === undefined || val === '') return null;
      const n = Number(val);
      return isNaN(n) ? null : n;
    };

    const projectRecipe = await prisma.$transaction(async (tx) => {
      // Delete existing steps
      await tx.projectRecipeStep.deleteMany({
        where: { recipeId: id }
      });

      // Update project and recreate steps
      return tx.projectRecipe.update({
        where: { id },
        data: {
          name,
          machineName,
          rotaryDiameter: parseNum(rotaryDiameter),
          notes,
          steps: {
            create: steps?.map((step: any, index: number) => ({
              name: step.name,
              power: parseNum(step.power),
              speed: parseNum(step.speed),
              frequency: parseNum(step.frequency),
              passesCount: parseNum(step.passesCount) || 1,
              hatchLineSpacing: parseNum(step.hatchLineSpacing),
              hatchAngle: parseNum(step.hatchAngle),
              order: index,
            })) || []
          }
        },
        include: {
          steps: true
        }
      });
    });

    return NextResponse.json(projectRecipe);
  } catch (error: any) {
    console.error("[PROJECT_RECIPE_PUT]", error);
    return new NextResponse(error.message || String(error), { status: 500 });
  }
}
