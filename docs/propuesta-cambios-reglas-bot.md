# Propuesta de cambios a las reglas del bot (para aprobar)

Nada de esto está aplicado. Los números (#N) son la posición de la regla en la lista de 181 reglas activas de `/dashboard/agent/knowledge`, ordenadas por tipo y fecha de creación; el título y el ID (ej. COT-002) son la referencia segura.

Decisiones del dueño ya tomadas: horario L-V 9-18 y sábado 11-16; entrega 3-4 días hábiles siempre a confirmar; corte de metal solo acero inoxidable (sujeto a revisión); instalación de vinil "se revisa y se cotiza aparte"; plotter 1.8 m; cama UV 90x60 cm; corte de acrílico hasta 15 mm; el bot se presenta como asistente de Laser Inova, no como Raúl.

## 1. Corregir (editar el texto)

| Regla | Cambio |
|---|---|
| #17 Saludo y presentación inicial ("Soy Raúl Basurto…") | Reescribir: "Hola, soy el asistente de Laser Inova. Con gusto te apoyo con tu proyecto…" |
| #22 Contacto Comercial Raúl Basurto | Dejarla solo como dato interno de escalamiento: "No presentarse con este nombre". |
| #44 Rechazo material cold rolled / #61 Restricción corte tubo metálico | Texto único: "Corte de metal: solo acero inoxidable y sujeto a revisión del equipo. No ofrecer acero al carbón, aluminio, latón ni tubo. Grabado láser de fibra sobre metal sí." |
| #53 Restricciones de máquina | Quitar la mención del tubo de acero (queda en la regla de metal). Confirmar el área máxima de corte: dice 120x90 cm, ¿sigue vigente? |
| #84 Señalética (SER-009) | Quitar PVC de los materiales de corte: "acrílico, MDF y otros; PVC solo impreso en UV". |
| #123 Tiempos de entrega (FAQ-011), #130 POL-007, #164 | Unificar: "En promedio 3 a 4 días hábiles según volumen y cola de trabajo; se confirma antes de iniciar. No prometer fecha exacta ni 24-48 h." |
| #163 RES-011 y #181 Cotización instalación de vinil, #113 FAQ-013 | Cambiar "tercero / instalador especializado" por: "La instalación de vinil se revisa con el equipo y se cotiza por separado según medidas, ubicación y condiciones del sitio." No decir que hay equipo propio. |
| #179 Política de entregas y ubicación | Agregar horario: L-V 9:00-18:00, sábados 11:00-16:00. Mantener "no dar la dirección a menos que pregunten". |
| #142 Pedidos pequeños (FAQ-010) | Aclarar: sí se aceptan; la web habla de lotes desde 100 piezas para maquila, pero piezas sueltas de personalización también se atienden. |

## 2. Borrar (duplicadas o internas)

Duplicadas (se deja la que se indica):
- Anticipo: dejar #122 y #175; borrar #141, #168, #169.
- Envíos: dejar #145, #151, #152, #167; borrar #120 y #159.
- Vigencia de cotizaciones: dejar #135; borrar #165.
- Formatos fibra: dejar #50; borrar #26.
- Termos: dejar #63, #103, #104; borrar #69.
- Tarjetas metálicas / NFC: dejar #96 y #90; borrar #75, #78, #100.
- Kits corporativos: dejar #89 y #106; borrar #68 y #99.
- Señalética: dejar #84 (ya corregida); borrar #81.
- Displays y backdrops: dejar #97; borrar #72.
- Ecosolvente: dejar #101; borrar #70.
- Vinil de piso: dejar #87; borrar #73.
- Serigrafía: dejar #52; borrar #38 y #42.
- DTF textil: dejar #47; borrar #31 y #65.
- DTF UV: dejar #83 y #105; borrar #67.
- Restricción de tubo: dejar la regla de metal corregida; borrar #41 y #25.
- Pruebas y muestras: dejar #166 y #129; borrar #154 y #34.

Internas o riesgosas (no deben estar donde el bot las pueda leer):
- #178 Meta comercial mensual ($200,000).
- #112 y #144 Tarifas históricas de viáticos y operador.
- #157 "Estamos preparando la cotización… en el transcurso de la mañana" (promete un horario fijo).
- #23 Frase de contacto "Raúl Basurto te atiende".

Para decidir tú: #161 Protocolo de datos bancarios incluye el número completo de tarjeta. Es útil para dar el dato cuando lo piden, pero es información sensible dentro de la base del bot.

## 3. Agregar (reglas nuevas, vienen de la web y de tus respuestas)

1. Horario: L-V 9:00-18:00, sábados 11:00-16:00.
2. Facturación: sí facturamos; el equipo pide los datos fiscales al confirmar el pedido.
3. Formas de pago: transferencia y efectivo; tarjeta solo si preguntan.
4. Tiempo de entrega promedio: 3 a 4 días hábiles, siempre a confirmar.
5. Corte de acrílico hasta 15 mm.
6. Cama plana UV: área 90x60 cm.
7. Plotter: ancho de impresión 1.8 m; lonas más grandes con sellado térmico.
8. Lonas: frontlit, mesh y backlit; en exterior duran de 12 a 24 meses.
9. Vinil impreso, decorativo y microperforado; rotulación de locales (instalación según la regla corregida).
10. Papel sintético y tela banner.
11. Backdrops, X-banners y roll-ups (estructura más impresión).
12. Señalética bajo normas oficiales de protección civil (NOM), colores y dimensiones reglamentarias.
13. Grabado en cuero, tactopiel y plásticos bicapa (Rowmark); agendas con nombres distintos desde un Excel.
14. Espejo grabado (se retira la capa posterior del espejo).
15. Celosías y piezas de acero inoxidable (sujeto a revisión).
16. Correo de contacto: informes@laserinova.com.
17. Maquila de volumen: lotes desde unas 100 piezas hasta miles.
18. PVC: no se corta ni se graba con láser (gases tóxicos); sí se imprime en UV.
19. Ubicación y entregas: dirección Cuichapa 223, Petrolera, Azcapotzalco (ya existe la #179; solo agregar el horario).

Importante: todos estos datos viven SOLO en las reglas, no en el prompt. Por eso conviene cargar esta lista antes de subir el cambio del prompt; si se despliega el prompt sin las reglas, el bot no sabrá horario, formas de pago, facturación ni capacidades y avisará al equipo cada vez que pregunten. Cada regla se redacta en lenguaje natural (como las conversacionales actuales) para que la búsqueda la encuentre.

## 4. Pendientes de tu parte

- Costo del servicio de trazado (el prompt dice "tiene costo extra" pero no hay monto ni regla).
- Si el recargo urgente del 30% (#176) sigue vigente.
- Si DTF UV, tequileros con UV rotativo, tarjetas NFC y lentes siguen ofreciéndose (la web no los menciona).
- Si quieres conservar los datos bancarios completos en la base del bot.
