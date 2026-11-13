# Reglas del bot de clientes (conteo y cambios)

Las reglas de negocio del bot viven en la tabla `AgentRule` (BD) y en Pinecone, y se editan en `/dashboard/agent/knowledge`. No están en el código. Este documento lleva la cuenta y el historial de cambios; el prompt está en `src/lib/agents/secretary/prompt.ts` y la búsqueda de reglas en `src/lib/agents/secretary/knowledge-base.ts`.

## Conteo (al 2026-11-12)

El panel lista **todas** las filas de `AgentRule`, activas o no. Desactivar una regla la saca de Pinecone (el bot ya no la ve) pero la deja en la tabla, y se puede reactivar.

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

Para volver a contar: sumar las filas por `active` en `AgentRule` y comparar con `describeIndexStats()` de Pinecone; deben coincidir.

## Cambios del 2026-11-12

**Desactivadas:** meta comercial mensual (interna), viáticos históricos (`EVT-009`) y las fórmulas de margen `COT-002`, `COT-003` y `COT-016` (las fórmulas de precio viven solo en `src/lib/pricing/`; el bot no calcula precios).

**Agregadas:**
- Horario de atención: L-V 9:00-18:00, sáb 11:00-16:00.
- Tiempo de entrega: 3 a 4 días hábiles, siempre a confirmar con el equipo.
- Espesor máximo de corte láser: acrílico 15 mm, MDF 12 mm.
- Corte de metal: solo acero inoxidable, lámina negra y lámina galvanizada. El latón no se corta ni se ofrece: solo se graba si el cliente trae la pieza.
- Réplicas: no se ofrecen como servicio; se trabaja como corte/grabado nuevo con el archivo y texto del cliente.

**Modificadas:** `datos_bancarios` (se quitó el número de tarjeta), `RESP-046` (el bot se presenta como asistente, no como una persona) y `RESP-043` (metales que sí se cortan).

## Pendientes

- **Actualizar `datos_bancarios`** con la cuenta vigente: el taller cambió de cuenta y la regla puede traer datos viejos. Hasta actualizarla, el bot los da tal cual están en la regla.
- Propuesta de limpieza de reglas duplicadas o contradictorias: `docs/propuesta-cambios-reglas-bot.md` (pendiente de aprobación).
- Umbral de relevancia de la búsqueda (hoy 0.6): trae reglas que no vienen al caso; subirlo requiere probar que ninguna consulta se quede sin regla.
- Regla de qué metales se pueden **grabar**: hoy no hay una; el bot responde que sí a cualquier metal que el cliente traiga.
