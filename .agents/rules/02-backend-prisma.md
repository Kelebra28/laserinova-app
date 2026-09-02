ESTÁNDARES BACKEND Y BASE DE DATOS:

1. ESTRUCTURA: Server Actions en /src/server/actions (deben retornar { success, data/error }). Lógica de Prisma en /src/server/services.

2. SEGURIDAD Y ZOD: Asume Zero Trust. Valida todo cuerpo de petición con Zod.

3. ENTORNOS AISLADOS: Asume SIEMPRE entorno LOCAL (MySQL en localhost). El provider de Prisma siempre es 'mysql'.

4. PASE A PRODUCCIÓN: Prohibido ejecutar o sugerir comandos hacia Hostinger a menos que yo escriba textualmente la frase 'INICIAR PASE A PRODUCCIÓN'.
