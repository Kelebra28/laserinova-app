const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Conectando a la base de datos de producción...");
  
  // Limpiar la contraseña encriptada de Ricardo Basurto para forzar el fallback de variables de entorno (.env / Vercel)
  const updated = await prisma.user.update({
    where: { email: 'ricardob@laserinova.com' },
    data: {
      emailPasswordEncrypted: null
    }
  });

  console.log(`¡Éxito! Se ha limpiado la contraseña encriptada de ${updated.name}.`);
  console.log("Ahora el CRM se verá forzado a usar las variables globales SMTP_USER y SMTP_PASS que configuraste en Vercel.");
}

main()
  .catch((e) => {
    console.error("Error al limpiar la contraseña:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
