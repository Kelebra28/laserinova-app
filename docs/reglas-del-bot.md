# Reglas del bot de clientes (conteo y cambios)

Las reglas de negocio del bot viven en la tabla `AgentRule` (BD) y en Pinecone, y se editan en `/dashboard/agent/knowledge`. No están en el código. Este documento lleva la cuenta y el historial de cambios; el prompt está en `src/lib/agents/secretary/prompt.ts` y la búsqueda de reglas en `src/lib/agents/secretary/knowledge-base.ts`.

## Conteo (al 2026-11-13, tras agregar facturación y PVC)

El panel lista **todas** las filas de `AgentRule`, activas o no. Desactivar una regla la saca de Pinecone (el bot ya no la ve) pero la deja en la tabla, y se puede reactivar.

| Concepto | Cantidad |
|---|---|
| Total en el panel (tabla `AgentRule`) | **193** |
| Activas (las que ve el bot) | **188** |
| Desactivadas | 5 |
| Vectores en Pinecone | 188 (coinciden 1 a 1 con las activas) |

| Namespace | Activas | Desactivadas |
|---|---|---|
| `sales_policies` | 71 | 5 |
| `product_protocols` | 50 | 0 |
| `material_rules` | 44 | 0 |
| `general_rules` | 23 | 0 |

Para volver a contar: sumar las filas por `active` en `AgentRule` y comparar con `describeIndexStats()` de Pinecone; deben coincidir.

## Cambios del 2026-11-12

**Desactivadas:** meta comercial mensual (interna), viáticos históricos (`EVT-009`) y las fórmulas de margen `COT-002`, `COT-003` y `COT-016` (las fórmulas de precio viven solo en `src/lib/pricing/`; el bot no calcula precios).

**Agregadas (2026-11-12 y 2026-11-13):**
- Facturación e IVA: sí se factura. Todas las cotizaciones ya llevan IVA (16%). Si el cliente pregunta si es obligatorio, se puede cotizar sin IVA, pero entonces no se emite factura; con factura es forzosamente con IVA y el bot nunca ofrece factura sin IVA.
- PVC (incluido espumado): solo cortes rectos, no se hace con láser ni se hacen figuras (círculos u otras formas); se ofrece la figura en acrílico o MDF.
- Horario de atención: L-V 9:00-18:00, sáb 11:00-16:00.
- Tiempo de entrega: 3 a 4 días hábiles, siempre a confirmar con el equipo.
- Espesor máximo de corte láser: acrílico 15 mm, MDF 12 mm.
- Corte de metal: solo acero inoxidable, lámina negra y lámina galvanizada. El latón no se corta ni se ofrece: solo se graba si el cliente trae la pieza.
- Réplicas: no se ofrecen como servicio; se trabaja como corte/grabado nuevo con el archivo y texto del cliente.
- Grabado en metal (2 reglas): se puede grabar cualquier metal, pero el resultado depende del metal, su color y acabado y el color que deja el grabado (no se promete efecto); y el área de grabado depende de la forma: en pieza plana es de 17 x 17 cm, si es más grande se hace por partes y puede no quedar parejo, y en piezas no planas se confirma con el equipo.

**Modificadas:** `datos_bancarios` (se quitó el número de tarjeta y el 2026-11-13 se actualizó a la cuenta vigente), `RESP-046` (el bot se presenta como asistente, no como una persona) `RESP-043` (metales que sí se cortan) y `restricciones_maquinas` (la prohibición de cortar PVC es con láser; el PVC se maneja con cortes rectos).

## Pendientes

- Propuesta de limpieza de reglas duplicadas o contradictorias: `docs/propuesta-cambios-reglas-bot.md` (pendiente de aprobación).
- Umbral de relevancia de la búsqueda (hoy 0.6): trae reglas que no vienen al caso; subirlo requiere probar que ninguna consulta se quede sin regla.
