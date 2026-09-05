<!-- BEGIN:hostinger-deployment-rules -->
9. REGLAS ESTRICTAS DE DESPLIEGUE EN HOSTINGER (NEXT.JS + PRISMA v7):
- **Forzar Renderizado Dinámico:** Absolutamente TODAS las páginas que hagan consultas a la base de datos (Prisma) deben incluir `export const dynamic = 'force-dynamic';` en la parte superior. Si Next.js intenta pre-renderizar en el servidor de build de Hostinger, el build fallará con `pool timeout` por falta de acceso a red.
- **Límite de Pool de Conexiones:** Al usar el adaptador de MariaDB, el límite de conexiones (`connectionLimit`) debe fijarse estrictamente en `3` (o máximo 5). Si se usan los 10 por defecto, Hostinger bloqueará las conexiones concurrentes durante cargas pesadas (como el Dashboard) causando `pool timeout`.
- **Limpieza de Contraseña (Backslash bug):** Hostinger inyecta barras invertidas (`\`) en caracteres especiales de las variables de entorno. Al instanciar Prisma, siempre limpia la contraseña parseada con `.replace(/\\/g, '')` para evitar el error `ER_ACCESS_DENIED_ERROR`.
- **Uso Obligatorio de Driver Adapter:** Ignora la documentación antigua. En Prisma v7 es OBLIGATORIO inicializar `PrismaClient` inyectando `PrismaMariaDb` (o el adaptador correspondiente). No uses el motor de Rust estándar.
<!-- END:hostinger-deployment-rules -->
