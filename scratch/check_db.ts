import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  console.log("LAST 10 CLIENTS:");
  console.log(JSON.stringify(clients, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
