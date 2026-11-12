# Cotizaciones y motor de precios

Qué es, cómo funciona y **por qué** está así. Código: `src/lib/pricing/`, `src/server/services/quote.service.ts`, `src/server/actions/quote.actions.ts`, `src/components/quotes/`, `src/app/dashboard/quotes/`.

## Modelo de datos (`prisma/schema.prisma`)

- `Quote`: folio único, cliente (`clientId`) **o** prospecto (`prospectName`/`contactId` de WhatsApp), `status`, `paymentStatus`, `taxable`, `subtotal/tax/total`, `realCostTotal`, `estimatedUtility`, `versionGroupId/versionName` (versiones OP).
- `QuoteConcept`: una partida (`conceptType`, cantidad, medidas, costos, `margin`, `finalUnitPrice`, `totalAmount`). Se borran en cascada con la cotización.
- `CalculationSnapshot`: foto de los costos globales y factores usados al calcular, para poder explicar un precio después.
- `CostConfiguration`: tabla `key/value` editable desde Configuración; son los costos globales (`costo_minuto_*`, `porcentaje_iva`, márgenes por escala…). Si falta una clave se usa el default de `pricing/config.ts`.

## Fórmulas (`src/lib/pricing/`)

| Archivo | Responsabilidad |
|---|---|
| `config.ts` | Defaults (`GLOBAL_COST_DEFAULTS`, `SERVICE_SITE_DEFAULTS`, `PRODUCT_PRICING_DEFAULTS`) y armado de `GlobalCosts` |
| `material.ts` | Costo de material: hoja, transporte, merma |
| `laser.ts` | Costo de máquina y precio de corte/grabado, **menudeo vs mayoreo** |
| `service-site.ts` | Servicio en sitio: costos por día + ganancia |
| `product.ts` | Productos de catálogo con **escalas por cantidad** |
| `concept.ts` | `calculateConcept`: aplica la fórmula según `conceptType` |
| `totals.ts` | Subtotal, IVA, total, utilidad |
| `server.ts` | Lee `CostConfiguration` y costos por modelo (solo servidor) |

Tipos de concepto: `CORTE`, `GRABADO`, `SERVICIO_SITIO` (con fórmula) · `IMPRESION`, `PRODUCTO`, `RESALE`, `OTRO` (precio/costo capturado a mano; en los de fórmula, el manual sustituye al calculado).

### Productos de proveedor (Doble Vela / Promo Opción)

`costo proveedor (sin IVA) → × (1+IVA) → ÷ (1 − margen según cantidad) = precio sin factura`; el IVA de venta se suma al final en la cotización.
- Márgenes por escala (defaults 50 / 40 / 30 %, escalas en 50 y 200 piezas), configurables.
- Piso `ganancia_minima_pieza` por pieza (sobre costo con IVA).
- `proveedor_incluye_iva` = 1 si el costo del proveedor ya trae IVA.
- **Todos los colores de un modelo se cotizan con el costo del color más caro** (`modelCostKey` = proveedor|modelo; `getModelMaxCostMap`). Motivo (dueño): así hay más ganancia; el costo cambia por color y no se quiere cotizar bajo (commit `de06c7a`).
- **El costo del proveedor se trata como SIN IVA y se le suma IVA antes del margen** (`proveedor_incluye_iva = 0`). Motivo (dueño): al comprarle al proveedor siempre se paga con IVA, así que el costo real del taller incluye IVA y el margen se calcula sobre eso.
- El `unitPrice` guardado en productos de proveedor es un resto del sync, **no** es precio manual (`isSupplierSyncedProduct`).

## IVA (regla actual y deuda histórica)

- **Regla actual:** el precio de las partidas es sin IVA; `calculateQuoteTotals` suma IVA encima solo si `taxable`. La utilidad es `subtotal − costo real` (el IVA no es utilidad). Commits `9321e06` y `10f6ef0` cambiaron a esto (antes el IVA venía incluido en el precio).
- **Pendiente:** 19 de 272 cotizaciones facturables (al 2026-11-11) se guardaron con la regla vieja (`total ≈ Σ partidas`). Abrir y guardar una sube el total 16 %. Detección: `taxable && |total − Σ concepts.totalAmount| < 1`. Corrección propuesta: dividir el precio de sus partidas entre 1.16 para que el total no cambie. El dueño la pospuso; **mostrar lista (folio, total actual, total corregido) y pedir aprobación antes de tocar datos.**

## Folios y versiones

- Folio `LI-AAAA-NNNN`. `generateNextFolioService` toma el número base más alto del año; **ignora versiones (`-OP2`) y folios especiales (`-ESP-`)**. Antes, si el último era una versión, el contador se reiniciaba en 0001 y chocaba con el folio único (commit `020750d`).
- Hay reintentos (hasta 5) si choca la unicidad (`P2002` en `Quote_folio_key`).
- Versiones: `duplicateQuoteAsVersionService` crea `<base>-OP<n>`; `approveQuoteVersionService` marca la elegida del grupo. Cotizaciones del bot usan prefijo distinto (`AG-…` / `LIA`, ver `agent.service.ts`).

## Estados

Fuente única: `src/constants/quote-status.ts` → `DRAFT, CALCULATED, SENT, APPROVED, IN_PRODUCTION, DELIVERED, REJECTED, CANCELLED`. Pago: `PENDING, PARTIAL, PAID`. Antes había 6 definiciones distintas y el detalle ofrecía estados inexistentes (`ACCEPTED`, `DONE`); no volver a definir estados en componentes.

## Cómo se llega a una cotización

1. Formulario completo (`/dashboard/quotes/new`) → `createQuoteService`.
2. Cotización rápida (`quotes/quick`, `QuickQuoteModal`) → `createQuickQuoteService`.
3. Desde el chat de WhatsApp: botón **Calcular** (`CalculateQuoteModal`) y el bot (ver `docs/whatsapp-bot.md`).
4. Clonar para otro cliente: `cloneQuoteFullService`.

El PDF sale de `src/lib/pdf.ts`; el cliente ve el link público de la cotización y una encuesta en `/s/[quoteId]`.
