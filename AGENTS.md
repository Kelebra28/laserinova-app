# CRM Laser Inova — mapa del proyecto

CRM interno de **Laser Inova** (taller de corte/grabado láser, impresión y promocionales, México). Lo usan el dueño y su equipo, sobre todo desde el celular. Idioma de UI, commits, comentarios y docs: **español**. Moneda MXN, IVA 16 %.

Qué hace: cotizaciones (con fórmulas de costo/precio), clientes, productos de catálogo de proveedores, materiales, inventario, finanzas/pagos, tareas, correo (IMAP/SMTP), y **chats de WhatsApp con un bot de IA** que atiende clientes y le arma borradores de cotización a los administradores.

## Stack

Next.js 16 (App Router, React 19, Tailwind v4) · Prisma 6 + **MySQL** · NextAuth v4 (credenciales) · Pusher (tiempo real) · Gemini (`@google/generative-ai`) + Pinecone (reglas del bot) · WhatsApp Cloud API (Meta) · Vercel Blob · web-push. Node 24.
**Producción está en Vercel** (confirmado por el dueño). `server.js` es un resto de Hostinger y no se usa en Vercel. En Vercel: await de los emits a Pusher, `after()` para trabajo posterior a la respuesta, logs de runtime en Vercel (solo `console.error/warn` sobreviven en producción).

> Next 16 tiene cambios de API: lee `node_modules/next/dist/docs/` antes de usar APIs que no conozcas. Ejemplo ya aplicado: `middleware.ts` se llama `src/proxy.ts`.

## Dónde vive cada cosa

| Qué | Dónde |
|---|---|
| Fórmulas de precio/costo (única fuente) | `src/lib/pricing/` → `docs/cotizaciones.md` |
| Estados de cotización/pago | `src/constants/quote-status.ts` |
| Menú, rutas y permisos | `src/constants/navigation.ts` + `src/lib/permissions.ts` + `src/proxy.ts` |
| Lógica de negocio (servidor) | `src/server/services/*.service.ts` |
| Server Actions (entrada desde UI) | `src/server/actions/*.actions.ts` (delgadas; llaman a services) |
| Bot de WhatsApp | `src/server/services/whatsapp*.service.ts`, `src/lib/agents/` → `docs/whatsapp-bot.md` |
| Webhook de Meta | `src/app/api/whatsapp/webhook/route.ts` |
| Pantalla de chats | `src/app/dashboard/chats/` (`_components`, `_hooks`, `_lib`) |
| API pública de catálogo (para la web) | `src/app/api/public/v1`, `src/lib/public-api.ts` |
| Proveedores de catálogo | `doblevela.service.ts`, `promoopcion.service.ts` |
| Esquema de BD | `prisma/schema.prisma` |
| PDF de cotización | `src/lib/pdf.ts` |
| Auditoría de arquitectura frontend | `docs/auditoria-frontend.md` (plan por fases) |

Páginas en `src/app/dashboard/<módulo>/`; componentes compartidos en `src/components/<dominio>/`; los de una sola ruta van en `_components/` junto a ella.

## Reglas que no se rompen

1. **Las fórmulas de precio viven solo en `src/lib/pricing/`.** Nunca recalcular precios, IVA o márgenes en un componente, action o prompt del bot. `src/lib/pricing/index.ts` no toca la BD (se puede importar en cliente); lo que lee BD está en `pricing/server.ts` (solo servidor).
2. **IVA aditivo:** el precio de las partidas es SIN IVA; el IVA se suma al total solo si `Quote.taxable`. Ver pendiente de datos abajo.
3. **Estados con valores de `quote-status.ts`.** `Quote.status` es `String` en BD; el servidor rechaza valores fuera de la lista.
4. **El bot nunca manda una cotización al cliente por su cuenta.** Crea borrador → lo ve un administrador → solo se envía tras `AUTORIZAR`.
5. **WhatsApp:** texto libre solo dentro de 24 h desde el último mensaje del cliente; fuera, plantilla aprobada (`src/lib/whatsapp-window.ts`).
6. **Doble Vela:** nunca llamar `GetExistenciaAll` de día (solo 8 pm–8 am). **Promo Opción:** máx. 3 logins por email cada 24 h; el token se cachea en `storage/`.
7. **Código de servidor fuera del bundle del cliente:** `import 'server-only'` (p. ej. `pusher-server.ts`). En componentes cliente importar constantes por archivo, no por el barrel `@/constants`.
8. **Permisos:** ADMIN/SUPERADMIN ven todo; el resto según `User.permissions` (JSON). Una ruta nueva se registra en `navigation.ts`, no en el proxy ni el Sidebar por separado.
9. La API pública nunca expone costo, proveedor ni notas (lista blanca en `public-api.ts`).

## Pendientes y trampas conocidas

- **19 cotizaciones con IVA viejo:** abrir y guardar una sube su total 16 %. No tocar datos sin mostrar la lista y pedir aprobación (detalle en `docs/cotizaciones.md`).
- Estado del refactor frontend: ver `docs/auditoria-frontend.md` (algunas fases ya aplicadas; constantes de estados, permisos y `server-only` en Pusher ya están).
- No hay tests automatizados. Validar con `npx tsc --noEmit`, `npm run lint`, `npm run build` y revisión manual (celular).
- `scratch/` (scripts de prueba y fotos de catálogo), `chatts/` (exportaciones de chats de clientes, datos personales, no en git) y `server.js` son restos locales/históricos; no son parte del producto.

## Cómo trabajar aquí

- Cambios de datos en producción: mostrar la lista afectada y pedir aprobación antes.
- Commits en español, estilo `tipo(módulo): qué y por qué` (ver `git log`).
- Al terminar un cambio relevante, actualizar el doc del módulo en `docs/` si cambió el **porqué** o una regla.
