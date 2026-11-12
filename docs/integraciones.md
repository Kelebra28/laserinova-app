# Integraciones, permisos y operación

## Proveedores de catálogo

- **Doble Vela** (`doblevela.service.ts`): web service SOAP-like por POST form. `GetExistencia` (un modelo) se puede llamar siempre. **`GetExistenciaAll` solo de 8 pm a 8 am**, 1+ veces por semana; el código no la usa y no debe usarla. Variable: `DOBLE_VELA_KEY`. Productos identificados por `sku` (CLAVE, ej. `A2558.01`).
- **Promo Opción** (`promoopcion.service.ts`): GraphQL. **Máximo 3 logins por email cada 24 h**; el token (23 h de vigencia) se cachea en `storage/promoopcion_token.json` (no está en git). Variables: `PROMOOPCION_*`.
- Scripts de apoyo en `scripts/` (copiar fotos del catálogo a Blob, limpiar inventario, backup local).

## API pública de catálogo (`/api/public/v1`, `lib/public-api.ts`)

Solo lectura, para la tienda web. Autenticada servidor a servidor (`PUBLIC_API_KEY`, comparación `timingSafeEqual`). Lista blanca de campos: nunca costo, proveedor ni notas. Controles por env: `PUBLIC_STORE_CATEGORIES` (vacío = nada), `PUBLIC_STORE_SHOW_PRICES` (apagado mientras se corrigen fórmulas), `PUBLIC_STORE_SHOW_STOCK`. Respuestas `Cache-Control: private, no-store`.

## Auth y permisos

- NextAuth con credenciales (email + bcrypt), sesión JWT con `role` y `permissions`.
- Roles: `ADMIN`, `SUPERADMIN` (ven todo), `SELLER` (según `permissions`, JSON `{modulo: boolean}`; llega como objeto o como string → `parsePermissions`).
- Una sola fuente de rutas/permisos: `src/constants/navigation.ts` (`NAV_ROUTES`) → la consumen `src/proxy.ts` (guard), `Sidebar` y la pantalla de usuarios. El proxy **no** debe importar íconos; los íconos van por `href` en `Sidebar.tsx`.
- Al eliminar un usuario con registros, se reasignan al admin.

## Tiempo real y notificaciones

Pusher (canal global `REALTIME_CHANNEL`, eventos en `constants/realtime.ts`): `notificationEmitter` en servidor, `lib/pusher.ts` + `useWhatsAppEvents` en el navegador. Push al celular con `web-push` (`lib/push.ts`, VAPID). Los admins reciben push cuando el bot necesita algo.

## Correo

IMAP (`imapflow`, `mailparser`) para leer y SMTP (`nodemailer`) para enviar; módulo en `/dashboard/email`, API en `src/app/api/email/*`. Cachea correos descargados en `storage/` (ignorado por git, commit `0723a68`).

## Archivos y media

Subidas a Vercel Blob (`BLOB_*`); media de WhatsApp se descarga y se comprime (`sharp`) y se sirve por `/api/media/[id]`.

## Datos

MySQL vía Prisma 6 (`DATABASE_URL`). Migraciones en `prisma/migrations`. `prisma/seed.ts` y `seed_bulk.ts` para datos de ejemplo. Hay `/api/backup` y `scripts/local-backup.cjs`. `dev.db` en la raíz es residuo de SQLite: el datasource actual es MySQL.

## Despliegue

**Vercel** (confirmado por el dueño). `server.js` y los comentarios de Hostinger/Passenger son de una etapa anterior; no se usan. Consecuencias: las funciones se congelan al responder, así que los emits a Pusher se esperan con `await` y el trabajo posterior se hace dentro de `after()` (webhook de WhatsApp, `maxDuration = 120`). `next.config.mjs` quita `console.log` en producción pero conserva `error` y `warn`, que son lo que aparece en los logs de Vercel.

## Variables de entorno (solo nombres; valores en `.env`, ignorado por git)

Base: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`. WhatsApp: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_QUOTE_TEMPLATE(_LANG)`, `WHATSAPP_ADMIN_TEMPLATE(_LANG)`, `ADMIN_ALERT_PHONE`. IA: `GEMINI_API_KEY`, `PINECONE_API_KEY`, `PINECONE_INDEX`. Tiempo real/push: `PUSHER_*`, `NEXT_PUBLIC_PUSHER_*`, `VAPID_*`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`. Correo: `SMTP_*`. Proveedores: `DOBLE_VELA_KEY`, `PROMOOPCION_*`. Tienda: `PUBLIC_API_KEY`, `PUBLIC_STORE_*`. Archivos: `BLOB_*`.
