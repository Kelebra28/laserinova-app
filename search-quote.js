const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const quotes = await prisma.quote.findMany({
    where: {
      OR: [
        { prospectName: { contains: 'Nancy' } },
        { project: { contains: 'Nancy' } },
        { project: { contains: 'cubierto' } },
        { description: { contains: 'cubierto' } },
        {
          client: {
             name: { contains: 'Nancy' }
          }
        },
        {
          concepts: {
             some: {
                OR: [
                  { description: { contains: 'cubierto' } },
                  { details: { contains: 'cubierto' } },
                  { description: { contains: 'Nancy' } },
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

  console.log(`Found ${quotes.length} matching quotes.\n`);
  for (const q of quotes) {
    const clientName = q.client ? q.client.name : q.prospectName;
    console.log(`- Folio: ${q.folio} | ID: ${q.id} | Date: ${q.createdAt.toLocaleDateString('es-MX')} | Client: ${clientName} | Project: ${q.project} | Total: $${q.total}`);
    
    for (const item of q.concepts) {
      console.log(`  * Item: ${item.conceptType} | Qty: ${item.quantity} | Desc: ${item.description} | Details: ${item.details || 'N/A'}`);
    }
    console.log('---');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
