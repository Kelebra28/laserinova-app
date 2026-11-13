# WhatsApp y bot de IA

Código: `src/app/api/whatsapp/webhook/route.ts`, `src/server/services/whatsapp.service.ts`, `whatsapp-admin.service.ts`, `src/lib/agents/`, `src/lib/whatsapp-window.ts`, `src/app/dashboard/chats/`.

## Dos bots sobre el mismo número

1. **Bot de clientes (la "secretaria").** Atiende a quien escribe. Prompt en `lib/agents/secretary/prompt.ts`; reglas del negocio vienen de **Pinecone** (`getRelevantRules`) y se administran en `/dashboard/agent/knowledge` (tabla `AgentRule`, namespaces como `sales_policies`). Se presenta como **asistente de Laser Inova**, no como una persona.
2. **Bot de gestión (administradores).** Los números en `ADMIN_ALERT_PHONE` le piden cotizaciones ("cotízale a Sara 220 navajas a $45"). Lógica en `whatsapp-admin.service.ts`.

## Regla de oro

**El bot nunca manda nada al cliente por su cuenta.** Crea un borrador, se lo muestra al administrador y solo lo envía cuando éste responde `AUTORIZAR` (con varios pendientes, `AUTORIZAR 0123` por folio). El estado se guarda como mensajes `INTERNAL` en el chat del admin: `[PENDIENTE] <quoteId>` / `[RESUELTA] <quoteId>`.

Los borradores también nacen solos (`proposeAutoDraft`): cuando el bot de clientes junta los datos y el **Chalán** (`lib/agents/chalan`) saca un precio confiable (material del catálogo con precio + tiempo de máquina estimado). El Chalán usa `calculateConcept` de `lib/pricing`; **no inventa precios**.

## Flujo de un mensaje entrante

1. Meta → `POST /api/whatsapp/webhook`. Se valida la firma HMAC (`WHATSAPP_APP_SECRET`; en producción sin secreto se rechaza).
2. `processIncomingMessage` guarda contacto y mensaje (descarga y comprime media con `sharp`).
3. Si el remitente es admin → `handleAdminMessage`. Si no → `processAIAgentResponse` dentro de `after()` (responde 200 a Meta primero; `maxDuration = 120`).
4. **Debounce:** espera unos segundos y revisa en BD si llegó un mensaje más nuevo; solo contesta el último (el cliente escribe en ráfagas).
5. **Candado por contacto** (`WhatsAppBotLock`): evita que dos ejecuciones contesten a la vez al mismo cliente. Si la tabla no existe, contesta sin candado (log de error).
6. Gemini con herramientas (function calling): enviar fotos de colores, estimar con el Chalán, avisar al equipo, etc.
7. Si algo falla **el cliente no recibe el error**: se avisa a los admins (`notifyAdmin`) y desde el chat se puede **reintentar** (`retryBotReply`).
8. Eventos en vivo al navegador: `notificationEmitter` → Pusher (`REALTIME_EVENTS`). En Vercel hay que hacer `await` del emit o la función se congela antes de enviarlo.

## Ventana de 24 h

Meta solo permite texto libre dentro de 24 h del último mensaje del cliente; fuera da error 131047. Fuera de ventana: **plantilla aprobada** (`WHATSAPP_QUOTE_TEMPLATE`, con el PDF como documento) o esperar a que el cliente escriba. La UI muestra avisos (`WindowNotice`, avisa a las 3 h de cerrarse). Lógica pura en `lib/whatsapp-window.ts` (segura para cliente).

## Detalles que ya mordieron

- Números de México: Meta entrega `521XXXXXXXXXX`; para enviar se normaliza a `52XXXXXXXXXX` (si no, error #131030). Comparar teléfonos por los últimos 10 dígitos (`lib/phone.ts`).
- El contacto simulador (`isSimulatorContact`, marcador en el nombre) sirve para probar el bot sin Meta.
- Los chats de administradores se separan de los de clientes en la lista.
- Notas internas con botón ("Ver cotización" / borrador): protocolo `|||…|||` en `lib/whatsapp/internal-message.ts`.
- Mensajes de error al cliente: nunca (commit `094adab`).

## Reglas del bot (contenido)

### Conteo de reglas (al 2026-11-12)

El panel `/dashboard/agent/knowledge` lista **todas** las filas de `AgentRule`, activas o no. Desactivar una regla la saca de Pinecone (el bot ya no la ve) pero la deja en la tabla, y se puede reactivar.

| Concepto | Cantidad |
|---|---|
| Total en el panel (tabla `AgentRule`) | **189** |
| Activas (las que ve el bot) | **184** |
| Desactivadas | 5 |
| Vectores en Pinecone | 184 (coinciden 1 a 1 con las activas) |

| Namespace | Activas | Desactivadas |
|---|---|---|
| `sales_policies` | 70 | 5 |
| `product_protocols` | 50 | 0 |
| `material_rules` | 41 | 0 |
| `general_rules` | 23 | 0 |

**Desactivadas el 2026-11-12:** meta comercial mensual (interna), viáticos históricos (`EVT-009`) y las fórmulas de margen `COT-002`, `COT-003` y `COT-016` (las fórmulas viven solo en `src/lib/pricing/`; el bot no calcula precios).

**Agregadas el 2026-11-12:** horario de atención (L-V 9-18, sáb 11-16), tiempo de entrega (3 a 4 días hábiles, a confirmar), espesor máximo de corte en acrílico (15 mm) y en MDF (12 mm), corte de metal (solo acero inoxidable, lámina negra y galvanizada; el latón solo se graba) y réplicas (no se ofrecen como servicio).

Para volver a contar: sumar las filas por `active` en `AgentRule` y comparar con `describeIndexStats()` de Pinecone; deben coincidir.

`docs/propuesta-cambios-reglas-bot.md` tiene una propuesta de limpieza **pendiente de aprobación** (duplicadas, internas/sensibles, nuevas). Decisiones ya tomadas por el dueño: horario L-V 9-18 y sáb 11-16; entrega 3-4 días hábiles siempre a confirmar; corte de metal solo acero inoxidable, lámina negra y lámina galvanizada; sin réplicas como servicio (se trabaja como corte/grabado nuevo con archivo); plotter 1.8 m; cama UV 90×60 cm; acrílico hasta 15 mm; instalación de vinil se cotiza aparte.

## UI de chats (`src/app/dashboard/chats/`)

Refactorizada en componentes (`_components`), hooks (`_hooks`: contactos, conversación, envío, realtime, grabación de audio) y utilidades (`_lib`). `ChatLayout.tsx` es el contenedor; mantener la lógica en hooks y los componentes presentacionales.
