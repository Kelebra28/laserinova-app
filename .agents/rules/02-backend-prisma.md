ESTÁNDARES BACKEND Y BASE DE DATOS:

1. ESTRUCTURA: Server Actions en /src/server/actions (deben retornar { success, data/error }). Lógica de Prisma en /src/server/services.

2. SEGURIDAD, RBAC Y ZOD: Asume Zero Trust estricto.
  * Valida perimetralmente todo cuerpo de Server Action con esquemas Zod (prohibido Mass Assignment).
  * Exige validación de rol (`requireAuth(["ADMIN"])`) para cualquier acción destructiva o administrativa.
  * Jamás expongas `passwordHash` ni datos confidenciales en consultas de Prisma (usa `select` restrictivo).

3. ENTORNOS AISLADOS: Asume SIEMPRE entorno LOCAL (MySQL en localhost). El provider de Prisma siempre es 'mysql'.

4. PASE A PRODUCCIÓN: Prohibido ejecutar o sugerir comandos hacia Hostinger a menos que yo escriba textualmente la frase 'INICIAR PASE A PRODUCCIÓN'.
