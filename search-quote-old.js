const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Broad search for anything before August 1st
  const oldQuotes = await prisma.quote.findMany({
    where: {
      createdAt: { lt: new Date('2026-08-01T00:00:00.000Z') },
      OR: [
        { prospectName: { contains: 'Nan' } },
        { project: { contains: 'Nan' } },
        { project: { contains: 'cubiert' } },
        { project: { contains: 'cuchill' } },
        { description: { contains: 'cubiert' } },
        { description: { contains: 'cuchill' } },
        {
          client: {
             name: { contains: 'Nan' }
          }
        },
        {
          concepts: {
             some: {
                OR: [
                  { description: { contains: 'cubiert' } },
                  { details: { contains: 'cubiert' } },
                  { description: { contains: 'Nan' } },
                  { description: { contains: 'cuchill' } },
                ]
             }
          }
        }
      ]
    },
    include: {
      client: true,
      concepts: true
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Found ${oldQuotes.length} matching old quotes.\n`);
  for (const q of oldQuotes) {
    const clientName = q.client ? q.client.name : q.prospectName;
    console.log(`- Folio: ${q.folio} | ID: ${q.id} | Date: ${q.createdAt.toLocaleDateString('es-MX')} | Client: ${clientName} | Project: ${q.project} | Total: $${q.total}`);
    
    for (const item of q.concepts) {
      console.log(`  * Item: ${item.conceptType} | Qty: ${item.quantity} | Desc: ${item.description}`);
    }
    console.log('---');
  }

  // If still 0, let's just search for ANY quote around March-May 2026 to see if we can spot it manually
  if (oldQuotes.length === 0) {
      console.log('\nSearching ALL quotes from March to May 2026 just in case...');
      const allOld = await prisma.quote.findMany({
          where: {
              createdAt: { 
                  gte: new Date('2026-03-01T00:00:00.000Z'),
                  lte: new Date('2026-06-01T00:00:00.000Z')
              }
          },
          include: { client: true },
          orderBy: { createdAt: 'desc' }
      });
      console.log(`Found ${allOld.length} quotes from Mar-May 2026:`);
      for (const q of allOld) {
          const clientName = q.client ? q.client.name : q.prospectName;
          console.log(`- Folio: ${q.folio} | Date: ${q.createdAt.toLocaleDateString('es-MX')} | Client: ${clientName} | Project: ${q.project}`);
      }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
