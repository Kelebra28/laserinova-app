# Auditoría de arquitectura frontend — CRM Laser Inova

Fecha: 2026-11-11 · Rama auditada: `refactor/formulas-de-cotizacion` (con los cambios sin commit del momento)
Alcance: `src/app`, `src/components`, `src/hooks`, `src/lib`, `src/constants`, `src/middleware.ts`.
Línea base: `npx tsc --noEmit` → **0 errores**. No hay tests automatizados en el proyecto (solo `dev`, `build`, `lint`), así que cada fase se valida con `tsc`, `npm run lint`, `npm run build` y revisión manual en el celular.

> Los números de línea son de la copia de trabajo actual (con cambios sin commit). Pueden moverse unas líneas cuando se haga commit.

---

## Resumen ejecutivo

| Criterio | Veredicto | En una frase |
|---|---|---|
| 1. Atomic design | ❌ No se cumple | Existe `components/ui/` con átomos decentes (`Button`, `Input`, `Select`, `UserAvatar`…) pero casi nadie los usa: hay **371 `<button>` hechos a mano en 91 archivos** y solo 3 archivos importan `Button`. Las carpetas están organizadas por dominio, no por nivel. |
| 2. Constantes centralizadas | ⚠️ A medias | `src/constants/` ya existe (con barrel `index.ts`) pero solo cubre cotizaciones, colores de material, formato y analytics. Los estados de cotización están definidos **en 6 lugares con valores distintos**, y eso ya causa un bug real (ver C-1). El tema de WhatsApp (`#111b21`, `#00a884`…) está regado en ~200 clases. |
| 3. Dumb vs smart | ❌ No se cumple | 10 componentes de más de 550 líneas mezclan estado, efectos, server actions y JSX. El peor es `ChatLayout.tsx` (1,488 líneas, 26 `useState`, 6 `useEffect`, 13 server actions, Pusher, grabación de audio y todo el render en un solo componente). |

**Lo más urgente no es el "orden" sino 5 problemas reales que salieron en la auditoría** (rendimiento en móvil y bugs). Van primero en el plan:

1. **Bug funcional:** el detalle de cotización ofrece estados `ACCEPTED` y `DONE` que el resto del sistema no conoce (C-1).
2. **Bundle móvil:** `src/lib/pusher.ts` mete el SDK de **servidor** de Pusher al bundle del navegador de `/dashboard/chats` (D-2).
3. **Fuga de memoria en el chat:** `URL.createObjectURL(file)` dentro del render crea un blob URL nuevo **en cada tecla** mientras hay archivos adjuntos, y nunca se libera (D-3).
4. **Doble sonido / 404:** el chat intenta reproducir `/notification.mp3`, que no existe (solo hay `notification.wav`), además del sonido que ya pone el hook (D-4).
5. **Permisos inconsistentes:** el `menuMap` de `src/middleware.ts` no conoce `/dashboard/products` ni `/dashboard/data-analytics`, así que esas rutas se validan contra el permiso `dashboard` en lugar de `products`/`reports` (C-3).

---

## Lo que dice Next 16 (revisado en `node_modules/next/dist/docs/`)

Antes de proponer estructura revisé la guía local. Lo relevante para este plan:

- **Colocación** (`01-getting-started/02-project-structure.md`): en App Router se puede poner cualquier archivo junto a la ruta; solo `page.tsx`/`route.ts` son públicos. Para separar componentes privados de una ruta se recomiendan **carpetas privadas `_carpeta`**. → Propongo `src/app/dashboard/chats/_components/` y `_hooks/` para lo que solo usa el chat, y dejar `src/components/` para lo compartido.
- **Frontera servidor/cliente** (`02-guides/server-and-client-boundary.md`, `05-server-and-client-components.md`): un módulo importado desde un Client Component entra completo al bundle del cliente. Para evitar que código de servidor se cuele, la guía recomienda `import 'server-only'` (Next lo resuelve sin instalar nada). → Base de la fase 1 (D-2).
- **Lazy loading** (`02-guides/lazy-loading.md`): `next/dynamic` para cargar Client Components pesados solo cuando se usan. → Modales del chat (`CalculateQuoteModal`, resumen IA, confirmación) y grabadora.
- **`middleware` → `proxy`** (`02-guides/upgrading/version-16.md:612`): en Next 16 el archivo `middleware.ts` está **deprecado** y se llama `proxy.ts`; el runtime es Node. `src/middleware.ts` sigue funcionando pero conviene renombrarlo en su propio PR (fase 9).
- Páginas completas con `"use client"` (`dashboard/email/page.tsx`, `dashboard/users/page.tsx`) pierden el render en servidor y cargan datos después del primer pintado; la guía recomienda que `page.tsx` sea Server Component y pase datos a un Client Component.

---

## 1. Atomic design

### 1.1 Qué hay hoy

`src/components/` está organizado **por dominio** (`quotes/`, `tasks/`, `finance/`…), con una carpeta `ui/` que funciona como "átomos/moléculas" y `layout/` como organismos de la app. No hay `templates/`. Eso no es malo por sí mismo — en App Router lo más práctico es **híbrido**: niveles atómicos solo para lo compartido (`ui/`), y dominio + colocación para lo demás.

El problema real es que **los átomos existen pero no se usan**:

| Componente en `ui/` | Nivel que le toca | Archivos que lo usan | Comentario |
|---|---|---|---|
| `Button.tsx` | átomo | **3** (`ChatLayout`, `Topbar`, `PushToggle`) | 371 `<button>` crudos en 91 archivos |
| `Input.tsx` | átomo | **1** (`ChatLayout`) | 282 `<input>` crudos |
| `Select.tsx` | átomo | 7 | 28 `<select>` crudos |
| `Card.tsx` | átomo | **0** | Código muerto |
| `Skeleton.tsx` | átomo | 20 | ✅ bien adoptado (los `loading.tsx`) |
| `UserAvatar.tsx` | átomo | 6 | Pero hay 4 avatares más hechos a mano (ver 1.2) |
| `SubmitButton.tsx` | molécula | 6 | Debería ser variante de `Button` con `useFormStatus` |
| `SearchInput.tsx` | molécula | 4 | ✅ |
| `AutocompleteInput.tsx`, `EmailInput.tsx`, `MenuSelect.tsx` | molécula | 1–2 | ✅ |
| `ImageUploadUI.tsx` | molécula | 2 | ✅ (presentacional + `hooks/useImageUpload.ts`, buen ejemplo a copiar) |
| `ConfirmationModal.tsx`, `ConfirmSaveModal.tsx`, `StatusModal.tsx` | organismo | 7 / 3 / 7 | Tres modales casi iguales + un cuarto en `tasks/` |
| `GlobalLoader.tsx` | átomo | 1 | |
| `email/EmailComposeModal.tsx`, `email/EmailBodyViewer.tsx` | organismo de dominio | 1 c/u | No es "ui", es del módulo correo |

### 1.2 Duplicados hechos a mano

**Avatares (5 implementaciones):**
- `src/components/ui/UserAvatar.tsx:11` (el "oficial"), con nombres de personas hardcodeados: `:25` `includes("ricardo")`, `:26` `includes("raul")`.
- `src/app/dashboard/chats/ChatLayout.tsx:24-46` (`AVATAR_GRADIENTS`, `avatarGradient`, `Avatar`, con soporte de foto de perfil).
- `src/components/settings/UsersPanel.tsx:25-43` (`AVATAR_GRADIENTS`, `avatarGradient`, `avatarInitials`).
- `src/components/tasks/TaskModal.tsx:79-90` (`avatarGradient`, `avatarInitials`).
- `src/components/tasks/CalendarTypes.ts:73` (`avatarInitials`) y `src/app/dashboard/email/page.tsx:22` (`getInitials`).

**Modales de confirmación (4):** `ui/ConfirmationModal.tsx`, `ui/ConfirmSaveModal.tsx`, `ui/StatusModal.tsx`, `tasks/ConfirmModal.tsx` (este último lo usan `users/page.tsx`, `UsersPanel.tsx`, `TaskBoard.tsx`). Además **34 archivos** arman su propio overlay `fixed inset-0` (lista en anexo A).

**Badges de estado:** cada pantalla arma su `<span className="px-3 py-1 rounded-full …">` con su propio mapa de colores (`quotes/[id]/page.tsx:68-72`, `QuoteRow`, `KanbanBoard`, `TaskBoard`, `TaskDetailModal`, `reports/page.tsx`). Falta un átomo `StatusBadge` alimentado por constantes.

**Formato de dinero:** `formatCurrency` existe en `src/constants/formatters.constants.ts` y solo lo usan 6 archivos; hay **79 llamadas sueltas a `toLocaleString('es-MX')`** en `app/` y `components/`, más helpers locales `money()` en `QuoteRow.tsx:14`, `QuotesClient.tsx:34`, `DashboardClient.tsx:31`, y `fmt()` en `lib/pdf.ts:109,736,956`.

**`cn()`**: definido a mano en `ChatLayout.tsx:20`; el resto concatena template strings. (No hay `clsx`/`tailwind-merge`; no hace falta agregarlos, basta un `lib/cn.ts`.)

### 1.3 Estructura propuesta (híbrida, compatible con Next 16)

```
src/components/
  ui/                      ← átomos y moléculas SIN lógica de negocio ni server actions
    atoms/   Button, IconButton, Input, Textarea, Select, Badge, StatusBadge, Avatar, Spinner, Skeleton
    molecules/ SearchInput, AutocompleteInput, EmailInput, MenuSelect, ImageUploadUI, FilterChips
    overlays/  Modal (base con portal), ConfirmDialog, StatusDialog, Drawer
  layout/                  ← organismos de la app: Sidebar, Topbar, PushToggle
  <dominio>/               ← organismos de negocio compartidos entre rutas (quotes/, tasks/, finance/…)
src/app/<ruta>/
  page.tsx                 ← Server Component: carga datos
  _components/             ← organismos usados solo por esa ruta (dumb)
  _hooks/                  ← estado/efectos de esa ruta (smart)
```

No recomiendo renombrar todo a `atoms/molecules/organisms` en todo el repo de golpe: rompe imports en ~100 archivos y no da rendimiento. Lo que sí da valor es: (a) un `Avatar`, `StatusBadge`, `Modal` y `ConfirmDialog` únicos, y (b) migrar pantallas a ellos **cuando se toquen**.

Reubicaciones concretas:
- `components/ui/email/*` → `app/dashboard/email/_components/` (solo los usa esa página).
- `components/tasks/ConfirmModal.tsx` → borrar y usar `ui/overlays/ConfirmDialog`.
- `components/ui/Card.tsx` → borrar (0 usos) o adoptarlo.
- `components/quotes/statusStyles.ts`, `components/tasks/CalendarTypes.ts` (parte de constantes) → `src/constants/`.
- `components/tasks/CalendarEngine.ts` → `src/lib/tasks/calendar.ts` (es lógica pura, no componente).

---

## 2. Constantes centralizadas

### 2.1 Qué hay hoy

`src/constants/` con `index.ts` (barrel) y `lib/constants.ts` que re-exporta todo. Bien encaminado, pero:
- Solo 17 archivos importan de ahí.
- El barrel re-exporta `analytics.constants.ts` (844 líneas de texto de documentación): cualquier `import { formatCurrency } from '@/constants'` desde un Client Component arrastra ese archivo al bundle si el tree-shaking no lo elimina. → Importar por archivo (`@/constants/quotes.constants`), no por barrel, en componentes cliente.
- `formatters.constants.ts` y `getHexForColor` son **funciones**, no constantes → van en `src/lib/format.ts`.

### 2.2 Hallazgos (por prioridad)

**C-1 · Estados de cotización definidos en 6 lugares — causa un bug (ALTA).**
El campo `Quote.status` es `String` en Prisma (`prisma/schema.prisma:162`). Los valores que usa el servidor son `DRAFT, CALCULATED, SENT, APPROVED, IN_PRODUCTION, DELIVERED, CANCELLED, REJECTED` (`src/server/services/quote.service.ts:24-30,244,403,659`).
Pero:
- `src/constants/quotes.constants.ts:5-12` define `DRAFT, SENT, ACCEPTED, REJECTED, CANCELLED, DONE` — **`ACCEPTED` y `DONE` no existen en el resto del sistema**, y faltan `CALCULATED`, `APPROVED`, `IN_PRODUCTION`, `DELIVERED`.
- `src/app/dashboard/quotes/[id]/page.tsx:375-383` pinta los botones de "Estado del Trabajo" iterando ese mapa. Resultado: desde el detalle se puede guardar `ACCEPTED`/`DONE` (que los tableros y reportes no reconocen) y **no se puede** marcar "Aprobada", "En proceso" ni "Entregada"; y una cotización `APPROVED` se ve sin etiqueta ni color en `:68-69`.
- Otras definiciones con etiquetas/colores propios: `components/quotes/statusStyles.ts:2-11` (la más correcta), `components/quotes/QuotesClient.tsx:26-30`, `components/quotes/QuoteFilters.tsx:75-78`, `components/dashboard/KanbanBoard.tsx:12-15`, `app/dashboard/reports/page.tsx:6-9`.
- Igual con pagos: `quotes.constants.ts:23-28` (`PENDING/PARTIAL/PAID/REFUNDED`, "Abono") vs `statusStyles.ts:13-17` (`PENDING/PARTIAL/PAID`, "Anticipo").
→ Una sola fuente: `src/constants/quote-status.ts` con `QUOTE_STATUSES` (`as const`), tipo `QuoteStatus`, y `{ label, badge, dot, kanbanColor }` por estado.

**C-2 · Estados/prioridades de tareas en 3 lugares (MEDIA).** `components/tasks/CalendarTypes.ts:55-61`, `TaskBoard.tsx:75-96`, `TaskDetailModal.tsx:86-97`. Mismas etiquetas, clases distintas. → `src/constants/task-status.ts`.

**C-3 · Permisos y menú en 4 lugares, ya desincronizados (ALTA).**
- `src/middleware.ts:4-24` (`menuMap`): **no tiene** `/dashboard/products` ni `/dashboard/data-analytics`; caen en el `/dashboard` del final (`permKey: "dashboard"`), así que un empleado con `products: false` sigue entrando por URL, y uno con `dashboard: false` no puede abrir productos aunque tenga el permiso. Tampoco distingue `/dashboard/agent/knowledge` (admin en el Sidebar).
- `src/components/layout/Sidebar.tsx:31-52` (`menuItems`, con `permKey: "products"`, `"finance"`, `"surveys"`).
- `src/app/dashboard/users/page.tsx:12-30` (`PERMISSION_MODULES`) — **no incluye `products`**, así que ese permiso no se puede editar.
- `src/server/actions/user.actions.ts:43` (permisos por defecto).
- El parseo de `permissions` (string JSON u objeto) está duplicado en `middleware.ts:40-45` y `Sidebar.tsx:110-115`; `=== "ADMIN"` aparece 16 veces en 12 archivos.
→ `src/constants/navigation.ts` con un solo arreglo `{ href, label, icon, permKey, adminOnly, exact }` que consumen Sidebar, proxy y pantalla de usuarios, más `src/lib/permissions.ts` (`parsePermissions`, `canAccess`, `ROLES`). Ojo: el proxy no debe importar íconos de `lucide-react`; separar `NAV_ROUTES` (datos) de `NAV_ICONS` (UI).

**C-4 · Tema WhatsApp del chat regado (MEDIA, mantenibilidad).**
Conteo de hex en `app/` + `components/`: `#8696a0` ×39, `#e9edef` ×29, `#00a884` ×22, `#202c33` ×20, `#2a3942` ×19, `#111b21` ×11, `#313d45` ×10, `#222d34` ×6, `#0b141a` ×5, `#005c4b`, `#d1d7db`, `#53bdeb`…
Archivos: `chats/ChatLayout.tsx`, `chats/CalculateQuoteModal.tsx`, `chats/page.tsx:23`, `dashboard/layout.tsx:18`, `components/layout/Topbar.tsx:32,52`.
→ Con Tailwind v4 lo correcto **no** es un archivo TS sino tokens en `src/app/globals.css` dentro de `@theme` (ya existe en `globals.css:8`):
```css
@theme {
  --color-wa-bg: #111b21;      /* panel */
  --color-wa-chat: #0b141a;    /* fondo conversación */
  --color-wa-panel: #202c33;
  --color-wa-border: #222d34;
  --color-wa-input: #2a3942;
  --color-wa-text: #e9edef;
  --color-wa-muted: #8696a0;
  --color-wa-accent: #00a884;
  --color-wa-bubble-out: #005c4b;
}
```
y usar `bg-wa-bg`, `text-wa-muted`, etc. Cero cambio visual, búsqueda y reemplazo mecánico.

**C-5 · URLs y datos de contacto (MEDIA).**
| Valor | Dónde |
|---|---|
| `https://app.laserinova.com` (fallback) | `server/services/whatsapp.service.ts:232,243`, `components/analytics/PrintableSchemaReport.tsx:192`, `constants/analytics.constants.ts:788` |
| `https://graph.facebook.com/v19.0/` | `server/services/whatsapp.service.ts:25,63,325`, `server/actions/whatsapp.actions.ts:188` (subir de versión = tocar 4 lugares) |
| `https://doblevela.com/images/large/` | `products/[id]/ProductDetailClient.tsx:39`, `products/[id]/ProductGallery.tsx:31`, `server/services/doblevela.service.ts:53`, `whatsapp.service.ts:1338` |
| `https://wa.me/` + limpieza de teléfono `replace(/\D/g,'')` | `api/email/send/route.ts:107,126`, `api/quotes/[id]/email/route.ts:137,173`, `providers/ProvidersClient.tsx:100-102`, `quotes/QuickQuoteModal.tsx:266-267` |
| `https://www.laserinova.com/`, `wa.me/525579398727` | `labels/LabelGeneratorClient.tsx:47-48` |
| **`https://g.page/r/YOUR_GOOGLE_MAPS_LINK/review`** | `app/s/[quoteId]/SurveyForm.tsx:90` — **placeholder en producción**: el botón "reseña en Google" de la encuesta pública no lleva a ningún lado. |
| `https://via.placeholder.com/400x300` | `products/ProductsClient.tsx:306` (servicio externo para un placeholder; mejor un SVG local) |
| `https://api.qrserver.com/v1/create-qr-code/` | `labels/LabelGeneratorClient.tsx:240,254` |
→ `src/constants/urls.ts` (`APP_URL`, `META_GRAPH_URL`, `DOBLEVELA_IMG_URL`, `GOOGLE_REVIEW_URL`…), `src/constants/company.ts` (sitio, WhatsApp, teléfono) y `src/lib/phone.ts` (`digitsOnly`, `last10`, `waLink`). `last10` ya está duplicado en `whatsapp.service.ts:125` y `whatsapp-admin.service.ts:304`.

**C-6 · Protocolo de mensajes internos `|||` (MEDIA).** El bot y las acciones meten datos en el texto del mensaje con `|||QUOTE:<id>|||` (`server/actions/quote.actions.ts:249,264`) o `|||<json>|||` (`lib/agents/chalan/chalan.service.ts:207`), y el chat lo parsea a mano **dos veces** (`ChatLayout.tsx:676-697` y `:1016-1043`, mismo bloque copiado). → `src/lib/whatsapp/internal-message.ts` con `encodeQuoteLink`, `encodeQuoteDraft`, `parseInternalMessage` y `buildNewQuoteUrl` usados por servidor y cliente.

**C-7 · Detección del simulador por texto mágico (MEDIA).** `name.includes('Simulador')` en `ChatLayout.tsx:88,204,720,791` + 21 apariciones en servidor; `hooks/useWhatsAppEvents.ts:32` además compara contra el teléfono `5211058132407`. → `SIMULATOR_CONTACT` en `src/constants/whatsapp.ts` + helper `isSimulatorContact(contact)`.

**C-8 · Varios (BAJA).**
- `UserAvatar.tsx:25-26`: colores fijos por nombre ("ricardo", "raul"). Si cambia el equipo hay que tocar código. → Mover a constante o, mejor, a un color guardado por usuario.
- Reacciones del chat `['👍','❤️','😂','😮','😢','🙏']` en `ChatLayout.tsx:1101`; filtros de lista en `:757`; tamaño máximo del textarea `120` en `:1351`; intervalo `60_000` en `:107`.
- `take: 50` / `take: 100` / `take: 500` como límites de paginación en `finance/page.tsx:96`, `finance/history/page.tsx:115`, `agent/usage/page.tsx:41`, `api/quotes/suggestions/route.ts:19`.
- Canal y eventos de Pusher (`'crm-channel'`, `'whatsapp_message'`, …) como strings en `hooks/useWhatsAppEvents.ts:29-66` y `lib/notification-emitter.ts:8` → `src/constants/realtime.ts` compartido.

### 2.3 Carpeta propuesta

```
src/constants/
  index.ts              (barrel solo para server; en cliente importar por archivo)
  quote-status.ts       C-1  estados de cotización y pago (labels, badges, colores kanban)
  task-status.ts        C-2
  navigation.ts         C-3  rutas, permKeys, adminOnly
  roles.ts              C-3  ROLES, ROLE_OPTIONS
  urls.ts               C-5
  company.ts            C-5  datos de contacto de Laser Inova
  whatsapp.ts           C-7  simulador, reacciones, ventana 24 h, filtros del chat
  realtime.ts           C-8  canal y nombres de eventos Pusher
  pagination.ts         C-8
  (existentes) colors.constants.ts, search.constants.ts, warehouses.constants.ts, providers.constants.ts, analytics.constants.ts
src/lib/
  format.ts             formatCurrency, formatNumber, formatDate (sale de constants/)
  phone.ts              digitsOnly, last10, waLink
  permissions.ts        parsePermissions, canAccess, isAdmin
  cn.ts
  whatsapp/internal-message.ts   C-6
src/app/globals.css     @theme con tokens wa-*  (C-4)
```

---

## 3. Dumb vs smart components

### 3.1 Ranking de componentes que mezclan todo

(`uSt` = `useState`, `uEf` = `useEffect`, `act` = llamadas/imports a server actions)

| Archivo | Líneas | uSt | uEf | act | Problema principal |
|---|---:|---:|---:|---:|---|
| `app/dashboard/chats/ChatLayout.tsx` | 1,488 | 26 | 6 | 13 | Todo en uno (ver 3.2) |
| `components/quotes/NewQuoteForm.tsx` | 1,133 | 16 | 4 | 2 | ~445 líneas idénticas a `EditQuoteForm` |
| `components/tasks/TaskBoard.tsx` | 1,025 | 22 | 2 | 5 | Tablero + filtros + drag&drop + resumen + acciones |
| `components/quotes/EditQuoteForm.tsx` | 994 | 14 | 2 | 2 | Gemelo de `NewQuoteForm` |
| `app/dashboard/receipts/ReceiptsDashboard.tsx` | 756 | 12 | 2 | — | `fetch` ×3 en el componente |
| `components/quotes/QuickQuoteModal.tsx` | 699 | 13 | 3 | 2 | |
| `app/dashboard/email/page.tsx` | 664 | 10 | 0 | — | **`page.tsx` con `"use client"`**: toda la bandeja se pinta después de hidratar |
| `app/dashboard/receipts/new/NewReceiptForm.tsx` | 642 | 14 | 0 | — | |
| `components/tasks/TaskDetailModal.tsx` | 625 | 8 | 0 | 6 | |
| `app/dashboard/processes/ProcessTabs.tsx` | 566 | 7 | 0 | 1 | |
| `components/tasks/TaskModal.tsx` | 550 | 16 | 0 | — | |
| `components/settings/UsersPanel.tsx` | 462 | 9 | 0 | 4 | Duplica la gestión de usuarios de `app/dashboard/users/page.tsx` (otro `page.tsx` cliente, 355 líneas) |

Buenos ejemplos que ya existen y sirven de plantilla: `hooks/useImageUpload.ts` + `ui/ImageUploadUI.tsx`, `hooks/useEmailInbox.ts` / `useEmailActions.ts`, y `components/tasks/CalendarPanels.tsx` (0 estado, 0 efectos: puro).

### 3.2 Caso principal: `ChatLayout.tsx`

**Qué hace hoy un solo componente:**
- Estado de lista: contactos, no leídos, búsqueda, filtro (`:80-85`).
- Estado de conversación: contacto activo, mensajes, carga, simulador (`:81-88`).
- Compositor: texto, archivos, respuesta, menú de reacciones (`:86-92`).
- Modales: resumen IA (+ caché), calcular cotización, borrar conversación (`:93-99`).
- Reloj de la ventana de 24 h (`:105-108`).
- Grabación de audio: `MediaRecorder`, `AudioContext`, canvas de ondas, timer (`:110-121`, `:277-418`).
- Tiempo real: `useWhatsAppEvents` (`:123-182`) + resync al volver a la app / reconectar Pusher (`:223-251`).
- Envío con mensajes optimistas, media, simulador (`:422-560`), bot on/off, reintento, resumen, borrar (`:562-673`).
- Parseo del protocolo `|||` (2 veces) y filtrado de contactos (`:675-718`).
- Render: lista (`:725-873`), cabecera (`:886-993`), burbujas (`:994-1222`), aviso de 24 h, barra de escribir (`:1245-1410`), 3 modales (`:1412-1488`).

**Problemas de rendimiento en móvil que causa esta mezcla:**
- **D-1 · Re-render total por cada tecla.** `inputText` vive en el componente raíz: cada letra re-renderiza la lista de contactos completa (con `windowState()` por contacto, `:791`) **y** todas las burbujas (con `new Date()`, `split('|||')`, `JSON.parse` y `decodeURIComponent` por mensaje interno, `:1001-1043`). Nada está memoizado. El `setNow` cada 60 s (`:107`) también re-renderiza todo. En un celular de gama media con 200+ mensajes esto se siente como lag al escribir.
- **D-2 · SDK de servidor en el bundle del cliente.** `src/lib/pusher.ts` importa **`pusher` (servidor) y `pusher-js` (cliente)** en el mismo módulo y construye `new PusherServer({...})` al cargarse. `ChatLayout.tsx:7` y `hooks/useWhatsAppEvents.ts:4` lo importan desde el cliente, así que el SDK de servidor (y sus polyfills de `crypto`) viaja al navegador. El único consumidor de `pusherServer` es `lib/notification-emitter.ts:1`.
- **D-3 · Fuga de blob URLs.** `ChatLayout.tsx:1275` `<img src={URL.createObjectURL(file)}>` dentro del render: un blob URL nuevo por cada render (por cada tecla, por cada evento de Pusher, por cada tick del reloj) y nunca hay `revokeObjectURL`. Con fotos de cámara de 3–5 MB en el celular, la memoria sube rápido.
- **D-4 · Sonido doble y archivo inexistente.** `useWhatsAppEvents.ts:41-47` ya reproduce `#notification-sound` (`dashboard/layout.tsx:31`, `notification.wav`) para mensajes entrantes; además `ChatLayout.tsx:157` hace `new Audio('/notification.mp3')`, que **no existe en `public/`** → una petición 404 por mensaje entrante.
- **D-5 · Carrera al cambiar de chat.** `loadMessages` (`:195-219`) no cancela ni verifica el contacto al volver de `getMessagesAction`: si tocas el chat A y luego el B rápido (red móvil lenta), la respuesta de A puede llegar después y mostrar los mensajes de A con la cabecera de B. El `resync` (`:228-233`) sí usa el ref; `loadMessages` debería hacer lo mismo.
- **D-6 · Audio fijo `audio/webm`.** `:291` y `:446` etiquetan la grabación como `webm`; en iPhone (Safari) `MediaRecorder` graba `audio/mp4`. Usar `mediaRecorder.mimeType`.
- **D-7 · Todo se descarga aunque no se use.** `CalculateQuoteModal`, el modal de resumen IA y la grabadora (Web Audio + canvas) van en el bundle inicial del chat. Con `next/dynamic` se cargan al abrirlos.
- Menores: `formatDuration` local (`:420`) tapa al importado de `@/lib/whatsapp-window` (`:14`); las reacciones (`:1102`) solo cambian el estado local — no hay server action, se pierden al recargar (confirmar si es intencional); `Contact`/`Message` son `any` (`:17-18`); `<img>` sin `loading="lazy"` en burbujas (`:1114,1147`; 0 usos de `loading="lazy"` o `next/image` en todo `app/`+`components/`).

**Partición propuesta** (carpetas privadas de la ruta, según la guía de colocación de Next 16):

```
src/app/dashboard/chats/
  page.tsx                         (Server Component, sin cambios)
  ChatLayout.tsx                   (~120 líneas: orquesta hooks y compone; "smart" delgado)
  _hooks/
    useChatContacts.ts             contactos, no leídos, búsqueda/filtro → visibleContacts (useMemo), bumpContactPreview
    useConversation.ts             contacto activo, mensajes, loadMessages con guardia anti-carrera, simulador
    useChatRealtime.ts             useWhatsAppEvents + resync (visibility/online/pusher state); despacha a los otros dos
    useSendMessage.ts              optimistas, texto, media, audio; recibe {contact, simulatorMode}
    useAudioRecorder.ts            MediaRecorder + AudioContext + timer + mimeType real; expone {start, stop, cancel, blob, duration, canvasRef}
    useNow.ts                      reloj de 60 s (solo lo consumen la cabecera y la lista, no todo el árbol)
  _components/                     (todos "dumb": props in, callbacks out, sin server actions)
    ContactList.tsx                buscador + chips + lista (memo)
    ContactListItem.tsx            (memo) avatar, nombre, preview, hora, badge, ventana 24 h
    ConversationHeader.tsx         nombre, bot on/off, simulador, acciones
    MessageList.tsx                scroll, separadores de día (memo por mensaje)
    MessageBubble.tsx              (memo) texto/imagen/audio/doc/sticker, estado, reacción
    InternalNoteBubble.tsx         nota interna con botón "Ver/Generar Cotización" (usa parseInternalMessage)
    WindowNotice.tsx               aviso de la ventana de 24 h
    Composer.tsx                   textarea con su PROPIO estado de texto → escribir ya no re-renderiza la lista
    AttachmentTray.tsx             previews con useObjectUrl (create + revoke) — arregla D-3
    RecorderBar.tsx                UI de grabación (recibe canvasRef/duración)
    SummaryModal.tsx               (next/dynamic)
    ChatAvatar.tsx → reemplazar por ui/atoms/Avatar con soporte de foto
  CalculateQuoteModal.tsx          (next/dynamic; mover a _components/)
```

Claves para que el corte sea seguro:
1. **Primero extraer componentes de presentación sin mover estado** (copiar el JSX tal cual a `MessageBubble`, `ContactListItem`, etc., con props). El comportamiento no cambia y el diff se revisa fácil.
2. Luego envolverlos en `React.memo` y bajar `inputText` a `Composer` — ahí aparece la mejora de rendimiento (D-1).
3. Después extraer hooks uno por uno (`useAudioRecorder` primero: es el más aislado, `:110-121` + `:277-418`).
4. `useChatRealtime` al final, porque toca las tres fuentes de estado.

### 3.3 Otros componentes a partir (resumen)

- **`NewQuoteForm` + `EditQuoteForm`** (2,127 líneas juntas, ~445 líneas compartidas): un `useQuoteForm(initial?)` (estado de partidas, cálculos con `@/lib/pricing`, validación) + `QuoteItemsEditor`, `QuoteTotals`, `QuoteClientSection` puros; los dos formularios quedan como wrappers de ~100 líneas que solo deciden qué server action llamar. **Esperar a que se haga commit de `refactor/formulas-de-cotizacion`**, que justo está tocando estos archivos.
- **`TaskBoard`**: `useTaskBoard` (filtros, agrupación, optimistas, drag&drop) + `TaskColumn`, `TaskCard`, `TaskFilters`, `TaskSummary` puros. Ya existe `TaskBoard.tsx:75-96` con config que va a `constants/task-status.ts`.
- **`app/dashboard/email/page.tsx`** y **`app/dashboard/users/page.tsx`**: convertir `page.tsx` a Server Component que cargue datos y pase a un `*Client.tsx`. En usuarios, además decidir entre esta página y `settings/UsersPanel.tsx` (hoy hay dos UIs para lo mismo, con avatares y listas de permisos distintas).
- **`ReceiptsDashboard`**, **`NewReceiptForm`**, **`QuickQuoteModal`**, **`TaskModal`/`TaskDetailModal`**: mismo patrón hook + presentación, prioridad baja (no son pantallas de uso móvil intensivo).

---

## 4. Plan por fases

Reglas para todas las fases:
- **No empezar hasta que se haga commit (o se descarte) del trabajo pendiente en `refactor/formulas-de-cotizacion`**: hoy hay 25 archivos modificados sin commit, incluidos `ChatLayout.tsx`, `NewQuoteForm.tsx`, `EditQuoteForm.tsx`, `QuickQuoteForm.tsx`, `quotes/new/page.tsx` y `dashboard/layout.tsx`. Cada fase sale de `main` actualizado, en su rama, y es un PR.
- Validación de cada PR: `npx tsc --noEmit` (hoy 0 errores), `npm run lint`, `npm run build`, y prueba manual en el celular (PWA) de la pantalla tocada.
- Un PR = un tipo de cambio (mover/renombrar **o** cambiar comportamiento, nunca los dos).

| Fase | PR | Riesgo | Impacto | Archivos |
|---|---|---|---|---|
| **1** | **Separar Pusher servidor/cliente** (D-2): crear `src/lib/pusher-server.ts` con `import 'server-only'` y `pusherServer`; dejar `src/lib/pusher.ts` solo con `getPusherClient`; cambiar 1 import en `notification-emitter.ts`. | Muy bajo | Bundle móvil de `/dashboard/chats` (único consumidor cliente hoy) | 3 archivos, ninguno con cambios sin commit |
| 2 | **Fix estados de cotización** (C-1): `src/constants/quote-status.ts` como única fuente con los 8 estados reales; `quotes/[id]/page.tsx` y `QuoteFilters`/`KanbanBoard`/`reports`/`QuotesClient`/`statusStyles` leen de ahí. Revisar en BD si ya hay cotizaciones guardadas como `ACCEPTED`/`DONE` y decidir a qué estado migrarlas. | Bajo-medio (cambia qué botones salen) | Bug funcional | ~7 archivos |
| 3 | **Navegación y permisos únicos** (C-3): `constants/navigation.ts` + `lib/permissions.ts`; middleware, Sidebar y `users/page.tsx` consumen lo mismo. Agrega `products` y `data-analytics` al guard y `products` a la pantalla de permisos. | Medio (cambia quién entra a qué) | Seguridad/consistencia | 4–5 archivos |
| 4 | **Arreglos rápidos del chat** (D-3, D-4, D-5, D-6): `useObjectUrl` para previews, quitar el `new Audio('/notification.mp3')`, guardia anti-carrera en `loadMessages`, `mimeType` real del grabador. Más el placeholder de Google Review (`SurveyForm.tsx:90`) si ya tienes el link. | Bajo | Memoria y fiabilidad en móvil | `ChatLayout.tsx` (+ `SurveyForm.tsx`) |
| 5 | **Tokens WhatsApp en `@theme`** (C-4): reemplazo mecánico de hex por `wa-*`. Cero cambio visual (comparar capturas antes/después). | Bajo | Mantenibilidad | 6 archivos |
| 6 | **Chat parte 1 — presentación** : extraer `ContactListItem`, `MessageBubble`, `InternalNoteBubble`, `ConversationHeader`, `WindowNotice` sin mover estado; `lib/whatsapp/internal-message.ts` para quitar el parseo duplicado (C-6). | Bajo-medio | Mantenibilidad | `chats/` |
| 7 | **Chat parte 2 — rendimiento**: `Composer` con su propio estado de texto, `React.memo` en ítems/burbujas, `useMemo` para `visibleContacts`, `useNow` local, `next/dynamic` para modales y grabadora (D-1, D-7). Medir con React Profiler antes/después escribiendo en un chat largo. | Medio | **El mayor beneficio en móvil** | `chats/` |
| 8 | **Chat parte 3 — hooks**: `useAudioRecorder` → `useConversation` → `useChatContacts` → `useSendMessage` → `useChatRealtime`, uno por commit. `ChatLayout.tsx` queda ~120 líneas. Tipar `Contact`/`Message`. | Medio | Mantenibilidad | `chats/_hooks/` |
| 9 | **Átomos base**: `Avatar` único (reemplaza los 5), `StatusBadge`, `Modal` + `ConfirmDialog` (reemplaza los 4 de confirmación), `lib/format.ts` y `lib/cn.ts`. Migrar solo los usos de esos componentes; borrar `ui/Card.tsx` si sigue sin uso. | Bajo-medio | Consistencia visual | ~20 archivos, en 2–3 PRs |
| 10 | **`middleware.ts` → `proxy.ts`** (deprecado en Next 16; ver `upgrading/version-16.md:612`). Probar login, redirección con `callbackUrl` y permisos en preview de Vercel antes de mergear. | Bajo-medio | Evita romperse en una versión futura | 1 archivo |
| 11 | **Constantes restantes** (C-5, C-7, C-8): `urls.ts`, `company.ts`, `whatsapp.ts`, `realtime.ts`, `lib/phone.ts`. | Bajo | Mantenibilidad | servicios + componentes |
| 12+ | **Cotizaciones**: `useQuoteForm` compartido por New/Edit; luego `TaskBoard`; luego `email/page.tsx` y `users/page.tsx` a Server Component; luego el resto del ranking 3.1. Adopción de `Button`/`Input` cuando se toque cada pantalla, no en un PR masivo. | Medio | Mantenibilidad | por módulo |

### Propuesta de primera fase (para aprobar antes de aplicarla)

**Fase 1 — separar Pusher servidor/cliente.** Es la de menor riesgo y beneficia al móvil:
- `src/lib/pusher-server.ts` (nuevo): `import 'server-only'` + el `new PusherServer({...})` actual tal cual.
- `src/lib/pusher.ts`: queda solo `getPusherClient` (y `import 'client-only'` opcional).
- `src/lib/notification-emitter.ts:1`: `import { pusherServer } from './pusher-server'`.
- No toca `ChatLayout.tsx` ni `useWhatsAppEvents.ts` (siguen importando `getPusherClient` de `@/lib/pusher`), ni ningún archivo con cambios sin commit.
- Verificación: `tsc`, `build`, y en el navegador confirmar que llegan mensajes en tiempo real, que suena la notificación y que el chunk de `/dashboard/chats` ya no incluye el paquete `pusher` de servidor.

Si `import 'server-only'` truena en el build, significa que algún Client Component más importaba `pusherServer` sin que lo viéramos — justo lo que queremos detectar.

---

## Anexo A — Archivos con overlays `fixed inset-0` hechos a mano (34)

`app/dashboard/receipts/ReceiptsDashboard.tsx`, `app/dashboard/receipts/new/NewReceiptForm.tsx`, `app/dashboard/agent/knowledge/KnowledgeClient.tsx`, `app/dashboard/chats/CalculateQuoteModal.tsx`, `app/dashboard/chats/ChatLayout.tsx`, `app/dashboard/email/page.tsx`, `components/clients/ClientActions.tsx`, `components/ui/ConfirmSaveModal.tsx`, `components/ui/StatusModal.tsx`, `components/ui/ConfirmationModal.tsx`, `components/ui/email/EmailComposeModal.tsx`, `components/settings/UsersPanel.tsx`, `components/payments/ChargeNotePreviewModal.tsx`, `components/payments/PaymentRequestsClient.tsx`, `components/tasks/TaskDetailModal.tsx`, `components/tasks/ConfirmModal.tsx`, `components/tasks/TaskModal.tsx`, `components/tasks/TaskBoard.tsx`, `components/tasks/TaskCalendar.tsx`, `components/materials/MaterialRow.tsx`, `components/materials/CategoryActions.tsx`, `components/quotes/QuotesClient.tsx`, `components/quotes/SendQuoteMailModal.tsx`, `components/quotes/QuickQuoteModal.tsx`, `components/quotes/NewQuoteForm.tsx`, `components/quotes/CloneQuoteButton.tsx`, `components/quotes/EditQuoteForm.tsx`, `components/providers/ProviderDrawer.tsx`, `components/inventory/ImportProductsModal.tsx`, `components/finance/TransactionForm.tsx`, `components/finance/HistoryFilter.tsx`, `components/layout/Sidebar.tsx`, `components/finance/TransactionEditModal.tsx`, `components/finance/ExpenseForm.tsx`.

## Anexo B — Cómo se midió

- Usos de átomos: `grep -rlE "ui/<Nombre>['\"]" src`.
- Elementos crudos: `grep -rn '<button' src/app src/components` (371), `<input` (282), `<select` (28).
- Hex: `grep -rhoE "#[0-9a-fA-F]{6}\b" src/app src/components | sort | uniq -c`.
- Ranking 3.1: conteo de `useState`, `useEffect`, imports/llamadas a `@/server/actions` y `fetch(` por archivo cliente de más de 250 líneas.
- Similitud New/Edit: líneas únicas (sin indentación) compartidas entre ambos archivos.
- Estados reales de cotización: literales en `src/server/services/quote.service.ts` y `whatsapp*.service.ts`.
