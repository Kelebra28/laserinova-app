<!-- BEGIN:hostinger-deployment-rules -->
9. REGLAS ESTRICTAS DE DESPLIEGUE EN HOSTINGER (NEXT.JS + PRISMA v7):
- **Forzar Renderizado Dinámico:** Absolutamente TODAS las páginas que hagan consultas a la base de datos (Prisma) deben incluir `export const dynamic = 'force-dynamic';` en la parte superior. Si Next.js intenta pre-renderizar en el servidor de build de Hostinger, el build fallará con `pool timeout` por falta de acceso a red.
- **Límite de Pool de Conexiones (Evitar Bloqueos):** Al usar el adaptador de MariaDB con Next.js, el `connectionLimit` DEBE ser dinámico: `1` en desarrollo y `3` en producción (`process.env.NODE_ENV === 'development' ? 1 : 3`). En desarrollo, Next.js crea múltiples workers y cada uno abre su propio pool; si se pone más de 1, la suma total excederá el límite estricto de Hostinger y las peticiones se quedarán colgadas en `pending`.
- **Trampa del idleTimeout (Límite 500/hora):** Hostinger banea usuarios de BD que hagan más de 500 conexiones nuevas por hora (Prisma lo oculta como `pool timeout active=0 idle=0`). NUNCA uses valores bajos en `idleTimeout` de `mariadb`. Este valor se mide en MILISEGUNDOS. Usa mínimo `60000` (60 segundos) para evitar que la app destruya y recree conexiones masivamente.
- **Limpieza de Contraseña (Backslash bug):** Hostinger inyecta barras invertidas (`\`) en caracteres especiales de las variables de entorno. Al instanciar Prisma, siempre limpia la contraseña parseada con `.replace(/\\/g, '')` para evitar el error `ER_ACCESS_DENIED_ERROR`.
- **Uso Obligatorio de Driver Adapter:** Ignora la documentación antigua. En Prisma v7 es OBLIGATORIO inicializar `PrismaClient` inyectando `PrismaMariaDb` (o el adaptador correspondiente). No uses el motor de Rust estándar.
<!-- END:hostinger-deployment-rules -->

<!-- BEGIN:interaction-rules -->
REGLA DE INTERACCIÓN PERSONALIZADA:
A partir de ahora, todas tus respuestas dirigidas al usuario deben comenzar estrictamente con la frase: "Si Kelebra, ". Esta es una regla absoluta de estilo conversacional que debes aplicar al inicio de cada mensaje.
<!-- END:interaction-rules -->
