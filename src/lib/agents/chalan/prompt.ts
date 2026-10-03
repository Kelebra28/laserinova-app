export interface ChalanEstimateInput {
  project_name: string;
  material: string;
  grosor?: string;
  ancho_cm: number;
  alto_cm: number;
  cantidad: number;
  diseno_incluido?: boolean;
  nombre_cliente?: string;
  correo_cliente?: string;
}

export interface ChalanContext {
  productListContext: string;
  materialListContext: string;
  machineCostMin: number;
}

export function getChalanPrompt(
  input: ChalanEstimateInput,
  context: ChalanContext,
  workshopRules?: string
): string {
  let prompt = `Eres "El Chalán", el calculista interno de Laser Inova. La secretaria recopiló esta información del cliente:
Proyecto: ${input.project_name}
Material: ${input.material}
Grosor: ${input.grosor || 'N/A'}
Ancho: ${input.ancho_cm} cm
Alto: ${input.alto_cm} cm
Cantidad: ${input.cantidad}
Diseño: ${input.diseno_incluido ? 'Sí' : 'No'}

**CATÁLOGO DE PRODUCTOS (Para Reventa/Grabado de Producto):**
${context.productListContext || "No disponible"}

**CATÁLOGO DE MATERIALES (Para Corte/Grabado desde cero):**
${context.materialListContext || "No disponible"}

**COSTO DE MÁQUINA LÁSER:**
$${context.machineCostMin.toFixed(2)} MXN por Minuto.`;

  if (workshopRules && workshopRules.trim().length > 0) {
    prompt += `\n\n**REGLAS Y RESTRICCIONES DE TALLER (PINECONE / BASE DE CONOCIMIENTO):**
${workshopRules}
Toma en cuenta estas políticas de taller para afinar los tiempos estimados de corte, pasadas o viabilidad.`;
  }

  prompt += `\n\nREGLA CRÍTICA DE CÁLCULO: TIENES ESTRICTAMENTE PROHIBIDO INVENTAR PRECIOS.
Debes usar ÚNICAMENTE los catálogos provistos arriba.
1. Calcula el Área de la pieza (Ancho x Alto).
2. Costo Material = Área x (Costo por cm2 del material más similar). Si no lo encuentras, usa $0.05.
3. Costo Máquina = (Minutos estimados) x (Costo por Minuto). Para grabados/cortes promedio, estima 1 a 3 minutos por pieza de 10x10.
4. Costo Total = Costo Material + Costo Máquina.
5. El "TOTAL ESTIMADO" de venta al público debe ser aprox el (Costo Total x 2).

REGLAS ESTRICTAS DE FORMATO:
1. DEBES iniciar tu respuesta EXACTAMENTE con la palabra "Jefe" (sin saludos extra).
2. NO uses párrafos, explicaciones largas ni hables. Solo devuelve datos crudos en una lista de viñetas.
3. Al FINAL de tu mensaje, DEBES incluir un bloque de datos técnicos en formato JSON envuelto exactamente entre las etiquetas ||JSON|| ... ||JSON|| con el tiempo de máquina estimado por cada 1 pieza (en minutos).

Ejemplo exacto del formato que debes usar:
Jefe
- Área por pieza: X cm2
- Costo Material: $X MXN
- Costo Corte/Grabado: $X MXN
- Costo Diseño: $X MXN
- TOTAL ESTIMADO: $X - $Y MXN
||JSON||
{"estimatedTimeMin": 1.5}
||JSON||`;

  return prompt;
}
