import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const defaults = [
    { key: 'costo_operador_sitio', name: 'Costo Operador (Sitio)', value: 1500, type: 'general' },
    { key: 'costo_transporte_sitio', name: 'Costo Transporte (Sitio)', value: 1500, type: 'general' },
    { key: 'costo_instalacion_sitio', name: 'Costo Instalación (Sitio)', value: 1000, type: 'general' },
    { key: 'costo_equipo_laser_sitio', name: 'Uso Equipo Láser (Sitio)', value: 3500, type: 'general' },
    { key: 'costo_consumibles_sitio', name: 'Consumibles/Imprevistos (Sitio)', value: 1000, type: 'general' },
    { key: 'costo_viaticos_sitio', name: 'Viáticos (Sitio)', value: 1300, type: 'general' },
  ];

  for (const item of defaults) {
    await prisma.costConfiguration.upsert({
      where: { key: item.key },
      update: {},
      create: {
        key: item.key,
        name: item.name,
        value: item.value,
        type: item.type,
      }
    });
    console.log(`Upserted ${item.key}`);
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
