import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const materials = await prisma.material.findMany();
  
  let updated = 0;
  for (const mat of materials) {
    if (mat.name.toLowerCase().includes('popotla')) {
      const newName = mat.name.replace(/popotla/i, '').replace(/\s+/g, ' ').trim();
      
      console.log(`Migrando: "${mat.name}" -> Nombre: "${newName}", Location: "Popotla"`);
      
      await prisma.material.update({
        where: { id: mat.id },
        data: { 
          name: newName,
          location: "Popotla"
        }
      });
      updated++;
    }
  }
  
  console.log(`Migración completada. ${updated} materiales actualizados.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
