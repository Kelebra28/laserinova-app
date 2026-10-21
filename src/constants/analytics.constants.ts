/**
 * Constantes y definiciones del Modelo de Datos para Analítica (Data Analytics & BI)
 * Fuente de verdad centralizada para la arquitectura de datos, flujos y esquemas.
 */

export interface SchemaField {
  name: string;
  type: string;
  isPk?: boolean;
  isFk?: boolean;
  isRequired?: boolean;
  defaultValue?: string;
  description: string;
  analyticalUsage: string; // Explicación para el Data Analyst
}

export interface SchemaModel {
  id: string;
  name: string;
  dbTable: string;
  domain: "VENTAS_CLIENTES" | "OPERACIONES_TALLER" | "TESORERIA_FINANZAS" | "OMNICANAL_IA" | "GESTION_EQUIPO";
  domainLabel: string;
  description: string;
  analyticalPurpose: string;
  keyMetrics: string[];
  relations: {
    targetModel: string;
    type: "1:1" | "1:N" | "N:1" | "M:N";
    foreignKey: string;
    description: string;
  }[];
  fields: SchemaField[];
}

export interface ProcessFlowNode {
  id: string;
  title: string;
  role: string;
  summary: string;
  modelsInvolved: string[];
  keyDataPoints: string[];
  kpiGenerated: string;
  iconName: string;
}

export interface ProcessFlow {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  mermaidCode: string;
  nodes: ProcessFlowNode[];
}

export interface KpiPlaybookItem {
  name: string;
  category: string;
  description: string;
  formula: string;
  sourceTables: string[];
  sqlSnippet: string;
  businessImpact: string;
}

export const DATA_DOMAINS = [
  { id: "ALL", label: "Todos los Modelos", color: "zinc" },
  { id: "VENTAS_CLIENTES", label: "Ventas y Clientes", color: "blue" },
  { id: "OPERACIONES_TALLER", label: "Taller & Costeo Láser", color: "amber" },
  { id: "TESORERIA_FINANZAS", label: "Finanzas & Cobranza", color: "emerald" },
  { id: "OMNICANAL_IA", label: "WhatsApp & Agente IA", color: "purple" },
  { id: "GESTION_EQUIPO", label: "Gestión & Calidad", color: "rose" },
] as const;

export const PROCESS_FLOWS: ProcessFlow[] = [
  {
    id: "commercial-industrial",
    title: "1. Ciclo Comercial & Operativo Láser (End-to-End)",
    subtitle: "Desde la prospección y costeo milimétrico hasta la entrega y post-venta",
    description: "Rastrea el ciclo de vida completo de una orden: cómo un prospecto se convierte en cliente, cómo se calculan costos de corte/grabado, cómo se asegura el anticipo y cómo se audita la entrega.",
    mermaidCode: `flowchart TD
    Lead["1. Prospección (Cliente / WhatsApp)"] --> Cot["2. Cotización & Algoritmo de Costeo"]
    Cot --> Rev{"¿Cliente Aprueba?"}
    Rev -->|Sí (APPROVED)| Cobro["3. Solicitud de Cobro (PaymentRequest)"]
    Rev -->|No (REJECTED)| FinCancel["Fin: Rechazada o Cancelada"]
    Cobro --> Anticipo["4. Anticipo (Receipt & Transacción Financiera)"]
    Anticipo --> Taller["5. Taller Láser (Task Kanban, Parámetros & Deducción Stock)"]
    Taller --> Liquidar["6. Liquidación de Saldo Pendiente"]
    Liquidar --> Entregado["7. Entrega (Quote DELIVERED & isDone=true)"]
    Entregado --> NPS["8. Encuesta de Satisfacción Post-Venta (CSAT/NPS)"]`,
    nodes: [
      {
        id: "step-lead",
        title: "1. Prospección / Alta de Cliente",
        role: "Ventas / Asistente WhatsApp",
        summary: "El prospecto inicia contacto por WhatsApp o ventanilla. Se genera o asocia la entidad Client con sus datos de contacto y facturación.",
        modelsInvolved: ["Client", "WhatsAppContact"],
        keyDataPoints: ["id", "name", "phone", "email", "rfc", "company"],
        kpiGenerated: "Crecimiento de Cartera (MoM), Tasa de Conversión Prospecto -> Cliente",
        iconName: "Users"
      },
      {
        id: "step-quote",
        title: "2. Cotización & Algoritmo de Costeo",
        role: "Vendedor / Cotizador",
        summary: "Se crea la Quote (Folio único) y se añaden partidas (QuoteConcept). El cotizador calcula tiempos de corte, grabado, cm² de material, horas máquina y consumibles.",
        modelsInvolved: ["Quote", "QuoteConcept", "Material", "Product", "CalculationSnapshot"],
        keyDataPoints: ["folio", "subtotal", "tax", "total", "realCostTotal", "estimatedUtility", "cutTime", "engraveTime"],
        kpiGenerated: "Margen Bruto Proyectado, Ticket Promedio por Cotización, Tasa de Bateo (Win Rate)",
        iconName: "FileText"
      },
      {
        id: "step-negotiation",
        title: "3. Aprobación & Solicitud de Cobro",
        role: "Cliente / Ventas",
        summary: "El cliente revisa y aprueba (Quote.status = 'APPROVED'). Se emite un PaymentRequest para autorizar el cobro del anticipo requerido para iniciar producción.",
        modelsInvolved: ["Quote", "PaymentRequest", "EmailLog"],
        keyDataPoints: ["amountRequested", "status (PENDING/PAID)", "sentDate", "closeDate"],
        kpiGenerated: "Tiempo de Cierre (Sales Cycle Length), Tasa de Aprobación de Presupuestos",
        iconName: "CheckCircle"
      },
      {
        id: "step-advance",
        title: "4. Anticipo & Generación de Recibo",
        role: "Administración / Cobranza",
        summary: "Se ingresa el anticipo. Se emite un Receipt formal foliado y se registra la FinancialTransaction correspondiente. La cotización pasa a paymentStatus = 'PARTIAL'.",
        modelsInvolved: ["Receipt", "FinancialTransaction", "Quote"],
        keyDataPoints: ["folio", "advance", "balance", "paymentMethod", "realAmountCollected"],
        kpiGenerated: "Efectivo Cobrado Inmediato, Días de Cartera (DSO inicial)",
        iconName: "Receipt"
      },
      {
        id: "step-production",
        title: "5. Producción en Taller & Kanban",
        role: "Operador de Máquina / Jefe de Taller",
        summary: "La orden pasa a Quote.status = 'IN_PRODUCTION'. Se crea la Task en el tablero Kanban y se aplican MachineProcess y ProjectRecipe específicos para el láser.",
        modelsInvolved: ["Task", "MachineProcess", "ProjectRecipe", "ProjectRecipeStep", "Material"],
        keyDataPoints: ["stockDeducted", "power", "speed", "frequency", "task.points", "task.progress"],
        kpiGenerated: "Lead Time de Fabricación, Eficiencia de Horas Máquina vs Cotizadas",
        iconName: "Cpu"
      },
      {
        id: "step-delivery-survey",
        title: "6. Liquidación, Entrega & Satisfacción",
        role: "Entrega / Calidad",
        summary: "Se cobra el saldo remanente (Quote.paymentStatus = 'PAID'), se marca como DELIVERED y se dispara automáticamente la encuesta de satisfacción (SurveyResponse).",
        modelsInvolved: ["Quote", "Receipt", "FinancialTransaction", "SurveyResponse", "SurveyAnswer"],
        keyDataPoints: ["realUtilityTotal", "isDone", "averageScore", "feedbackText"],
        kpiGenerated: "Margen Real vs Estimado, Net Promoter Score (NPS), Ratio de Recompra",
        iconName: "Star"
      }
    ]
  },
  {
    id: "whatsapp-ai-flow",
    title: "2. Embudo Omnicanal WhatsApp & Agente IA",
    subtitle: "Rastreo de interacciones automáticas, consumo de tokens y conversión a ventas",
    description: "Muestra cómo entran los mensajes de clientes a través de la API oficial de Meta, cómo el bot IA consulta políticas y cómo se auditan costos de LLM.",
    mermaidCode: `flowchart TD
    Inbound["1. Mensaje WhatsApp (Webhook Meta)"] --> Check{"¿botMode Activo?"}
    Check -->|Sí (Automático)| RAG["2. Consulta Reglas & Pinecone (RAG Embeddings)"]
    Check -->|No (Manual)| Humano["Atención Manual por Vendedor en CRM"]
    RAG --> LLM["3. Inferencia Google Gemini LLM"]
    LLM --> Audit["4. Registro Auditoría Tokens en AiUsageLog"]
    Audit --> MetaOut["5. Envío de Respuesta al Cliente"]
    MetaOut --> Qualify{"¿Lead Calificado?"}
    Qualify -->|Sí| Cotiz["6. Creación de Quote vinculada a WhatsAppContact"]
    Qualify -->|No| Wait["En espera de siguiente mensaje"]`,
    nodes: [
      {
        id: "wa-inbound",
        title: "1. Mensaje Entrante (Meta Webhook)",
        role: "Cliente (WhatsApp)",
        summary: "El usuario envía un mensaje de texto, imagen o audio. Se registra WhatsAppMessage con direction = 'INBOUND' y se crea o busca el WhatsAppContact.",
        modelsInvolved: ["WhatsAppContact", "WhatsAppMessage"],
        keyDataPoints: ["phone", "name", "botMode", "content", "type", "timestamp"],
        kpiGenerated: "Volumen de Mensajes Diarios, Horarios Pico de Prospección",
        iconName: "MessageCircle"
      },
      {
        id: "wa-ai-engine",
        title: "2. Razonamiento IA & Contexto (RAG)",
        role: "Agente IA (Gemini + Pinecone)",
        summary: "Si botMode = true, el agente consulta AgentRule y la base vectorial de Pinecone para responder con precios, catálogos y políticas comerciales.",
        modelsInvolved: ["AgentRule", "WhatsAppContact"],
        keyDataPoints: ["namespace", "title", "content", "isVectorized"],
        kpiGenerated: "Tasa de Respuestas Autónomas sin Intervención Humana (First Contact Resolution)",
        iconName: "Bot"
      },
      {
        id: "wa-token-audit",
        title: "3. Auditoría de Tokens & Costo en USD",
        role: "Motor de Métricas",
        summary: "Cada llamada al LLM guarda un registro inmutable en AiUsageLog con tokens de entrada, salida y costo en dólares.",
        modelsInvolved: ["AiUsageLog", "WhatsAppContact"],
        keyDataPoints: ["agentName", "inputTokens", "outputTokens", "totalTokens", "estimatedCost"],
        kpiGenerated: "Costo de IA por Conversación, Eficiencia de Prompts (Tokens / Lead)",
        iconName: "DollarSign"
      },
      {
        id: "wa-quote-link",
        title: "4. Vinculación a Cotización o Escalación",
        role: "Vendedor Humano / CRM",
        summary: "Cuando el prospecto califica, se asocia el WhatsAppContact a un Client y se crea la Quote correspondiente con contactId.",
        modelsInvolved: ["Quote", "WhatsAppContact", "Client"],
        keyDataPoints: ["contactId", "clientId", "quote.id", "folio"],
        kpiGenerated: "Lead-to-Opportunity Conversion Rate, ROI de Automatización IA",
        iconName: "TrendingUp"
      }
    ]
  },
  {
    id: "financial-pnl-flow",
    title: "3. Conciliación Financiera & Utilidad Real (P&L)",
    subtitle: "Rastreo de flujos de caja, cobros reales, gastos por proyecto y margen neto",
    description: "Esquema contable del CRM para que el analista entienda la diferencia entre lo presupuestado en papel y el dinero real depositado y gastado.",
    mermaidCode: `flowchart TD
    Presupuesto["1. Quote (Total Presupuestado & Utilidad Estimada)"]
    Cobranza["2. Cobranza Efectiva (FinancialTransaction INGRESO / ANTICIPO)"]
    Gastos["3. Compras & Gastos de Proyecto (FinancialTransaction GASTO_PROYECTO)"]
    
    Presupuesto -.-> Formula
    Cobranza --> Formula["4. Conciliación P&L (Cobrado Real - Gastos Reales)"]
    Gastos --> Formula
    Formula --> Real["5. Utilidad Real (Quote.realUtilityTotal)"]
    Real --> Variance["6. Varianza (Utilidad Real vs Utilidad Estimada)"]`,
    nodes: [
      {
        id: "fin-projected",
        title: "1. Venta Proyectada (Quote)",
        role: "Cotizador",
        summary: "Se estima subtotal, costo de material y utilidad teórica (estimatedUtility = total - realCostTotal).",
        modelsInvolved: ["Quote", "QuoteConcept"],
        keyDataPoints: ["subtotal", "tax", "total", "realCostTotal", "estimatedUtility"],
        kpiGenerated: "Margen Bruto Proyectado (%)",
        iconName: "FileSpreadsheet"
      },
      {
        id: "fin-cashin",
        title: "2. Cobranza Efectiva (Cash In)",
        role: "Tesorería",
        summary: "Depósitos bancarios y efectivo registrados como FinancialTransaction (tipo INGRESO/ANTICIPO/LIQUIDACION) y actualizados en Quote.realAmountCollected.",
        modelsInvolved: ["FinancialTransaction", "Receipt", "Quote"],
        keyDataPoints: ["amount", "paymentMethod", "type", "date", "realAmountCollected"],
        kpiGenerated: "Efectivo Real Ingresado, DSO (Días Promedio de Cobranza)",
        iconName: "Banknote"
      },
      {
        id: "fin-cashout",
        title: "3. Gastos Directos e Indirectos (Cash Out)",
        role: "Compras & Administración",
        summary: "Compras de placas, acrílico, consumibles o viáticos registrados con tipo GASTO_PROYECTO vinculados al quoteId o GASTO_OPERATIVO.",
        modelsInvolved: ["FinancialTransaction", "Provider"],
        keyDataPoints: ["amount", "category", "quoteId", "provider", "taxAmount"],
        kpiGenerated: "Costos Reales Operativos, Desviación de Costo de Material (Varianza)",
        iconName: "DollarSign"
      },
      {
        id: "fin-real-margin",
        title: "4. Utilidad Neta Real & Cierre",
        role: "Dirección Financiera",
        summary: "Quote.realUtilityTotal = realAmountCollected - sum(gastos directos del proyecto). Auditoría final de rentabilidad por orden.",
        modelsInvolved: ["Quote", "FinancialTransaction"],
        keyDataPoints: ["realUtilityTotal", "paymentStatus", "status"],
        kpiGenerated: "Margen Neto Real vs Margen Estimado, Rentabilidad por Línea de Producto",
        iconName: "PieChart"
      }
    ]
  }
];

export const SCHEMA_MODELS: SchemaModel[] = [
  {
    id: "quote",
    name: "Quote (Cotizaciones)",
    dbTable: "Quote",
    domain: "VENTAS_CLIENTES",
    domainLabel: "Ventas y Clientes",
    description: "Entidad central del CRM. Almacena cotizaciones, estados comerciales, condiciones de pago, montos presupuestados y auditoría de rentabilidad.",
    analyticalPurpose: "Es la tabla de hechos (Fact Table) principal para análisis de ventas, embudos comerciales, rentabilidad por proyecto y ciclo de vida de cobro.",
    keyMetrics: [
      "Volumen de ventas mensual (Sum of total)",
      "Margen proyectado vs Margen real",
      "Win Rate (% con status = APPROVED / DELIVERED)",
      "Tiempo de cierre (closeDate - createdAt)",
      "Saldos pendientes por cobrar (total - realAmountCollected)"
    ],
    relations: [
      { targetModel: "Client", type: "N:1", foreignKey: "clientId", description: "Cliente al que pertenece la cotización" },
      { targetModel: "User", type: "N:1", foreignKey: "userId", description: "Vendedor o creador de la cotización" },
      { targetModel: "WhatsAppContact", type: "N:1", foreignKey: "contactId", description: "Contacto de WhatsApp originador del lead" },
      { targetModel: "QuoteConcept", type: "1:N", foreignKey: "quoteId", description: "Desglose de partidas y cálculos técnicos" },
      { targetModel: "FinancialTransaction", type: "1:N", foreignKey: "quoteId", description: "Movimientos bancarios asociados al proyecto" },
      { targetModel: "SurveyResponse", type: "1:1", foreignKey: "quoteId", description: "Encuesta de satisfacción de la orden" },
      { targetModel: "Receipt", type: "1:N", foreignKey: "quoteId", description: "Recibos de anticipo o liquidación emitidos" }
    ],
    fields: [
      { name: "id", type: "String (UUID)", isPk: true, isRequired: true, description: "Identificador único de la cotización", analyticalUsage: "Llave primaria para joins con partidas y finanzas." },
      { name: "folio", type: "String", isRequired: true, description: "Folio legible para el cliente (ej. COT-2024-001)", analyticalUsage: "Dimensión natural para reportes ejecutivos." },
      { name: "clientId", type: "String?", isFk: true, description: "ID del cliente asociado", analyticalUsage: "Join con Client para análisis de valor de vida (LTV)." },
      { name: "contactId", type: "String?", isFk: true, description: "ID del contacto de WhatsApp", analyticalUsage: "Join con WhatsAppContact para atribución de canales." },
      { name: "userId", type: "String", isFk: true, isRequired: true, description: "ID del vendedor", analyticalUsage: "Dimensión para evaluar desempeño por vendedor." },
      { name: "project", type: "String", isRequired: true, description: "Título descriptivo del proyecto o servicio", analyticalUsage: "Minería de texto para categorizar proyectos frecuentes." },
      { name: "status", type: "String", isRequired: true, defaultValue: "'DRAFT'", description: "DRAFT, CALCULATED, SENT, APPROVED, REJECTED, IN_PRODUCTION, DELIVERED, CANCELLED", analyticalUsage: "Dimensión crucial para embudos de conversión (Funnel)." },
      { name: "paymentStatus", type: "String", isRequired: true, defaultValue: "'PENDING'", description: "PENDING, PARTIAL, PAID", analyticalUsage: "Segmentación de cuentas por cobrar y salud financiera." },
      { name: "taxable", type: "Boolean", isRequired: true, defaultValue: "true", description: "Si aplica cálculo de IVA (16%)", analyticalUsage: "Filtrado fiscal para conciliación contable." },
      { name: "subtotal", type: "Float", isRequired: true, defaultValue: "0", description: "Monto neto antes de impuestos", analyticalUsage: "Métrica base de ventas sin distorsión impositiva." },
      { name: "tax", type: "Float", isRequired: true, defaultValue: "0", description: "Impuesto al valor agregado calculado", analyticalUsage: "Cálculo de pasivos fiscales." },
      { name: "total", type: "Float", isRequired: true, defaultValue: "0", description: "Monto bruto total facturable", analyticalUsage: "Fact Table Measure: Venta total presupuestada." },
      { name: "realCostTotal", type: "Float", isRequired: true, defaultValue: "0", description: "Suma de costos técnicos estimados (material + máquina + mano de obra)", analyticalUsage: "Base para costeo industrial y margen de contribución." },
      { name: "estimatedUtility", type: "Float", isRequired: true, defaultValue: "0", description: "Utilidad proyectada (total - realCostTotal)", analyticalUsage: "KPI de margen proyectado por cotización." },
      { name: "realAmountCollected", type: "Float?", defaultValue: "0", description: "Dinero en efectivo/banco efectivamente cobrado", analyticalUsage: "Métrica real de cobranza; (total - realAmountCollected) = Cartera Vencida." },
      { name: "realUtilityTotal", type: "Float?", defaultValue: "0", description: "Utilidad neta real post-gastos comprobados", analyticalUsage: "Métrica reina de rentabilidad real de la empresa." },
      { name: "stockDeducted", type: "Boolean", isRequired: true, defaultValue: "false", description: "Si el inventario de materiales/productos ya fue rebajado", analyticalUsage: "Control de mermas e inventario en proceso." },
      { name: "sentDate", type: "DateTime?", description: "Fecha de envío al cliente", analyticalUsage: "Cálculo de velocidad comercial (Velocity)." },
      { name: "closeDate", type: "DateTime?", description: "Fecha en que se aprobó o rechazó", analyticalUsage: "Cálculo de Sales Cycle Length en días." },
      { name: "createdAt", type: "DateTime", isRequired: true, description: "Fecha y hora de creación", analyticalUsage: "Dimensión temporal clave (Día, Semana, Mes, Cohorte)." },
      { name: "updatedAt", type: "DateTime", isRequired: true, description: "Última modificación", analyticalUsage: "Auditoría de actividad y re-cotizaciones." }
    ]
  },
  {
    id: "quote-concept",
    name: "QuoteConcept (Partidas de Cotización)",
    dbTable: "QuoteConcept",
    domain: "OPERACIONES_TALLER",
    domainLabel: "Taller & Costeo Láser",
    description: "Detalle línea por línea de una cotización: desglose de material, producto promocional o servicio de corte/grabado con costos desglosados.",
    analyticalPurpose: "Permite análisis a nivel granular: qué materiales son más rentables, cuántos minutos de corte se consumen y qué tipos de máquinas rinden más.",
    keyMetrics: [
      "Minutos totales de corte láser (cutTime)",
      "Minutos totales de grabado (engraveTime)",
      "Costo de materiales vs costo de producción",
      "Margen unitario por tipo de concepto (corte, grabado, producto, servicio)"
    ],
    relations: [
      { targetModel: "Quote", type: "N:1", foreignKey: "quoteId", description: "Cotización a la que pertenece esta partida" },
      { targetModel: "Material", type: "N:1", foreignKey: "materialId", description: "Material utilizado (si aplica)" },
      { targetModel: "Product", type: "N:1", foreignKey: "productId", description: "Producto de catálogo utilizado (si aplica)" }
    ],
    fields: [
      { name: "id", type: "String (UUID)", isPk: true, isRequired: true, description: "ID único de la partida", analyticalUsage: "Identificador atómico de línea de venta." },
      { name: "quoteId", type: "String", isFk: true, isRequired: true, description: "ID de la cotización padre", analyticalUsage: "Clave de unión con Quote." },
      { name: "conceptType", type: "String", isRequired: true, description: "Tipo: 'MATERIAL', 'PRODUCT', 'SERVICE', 'CUSTOM'", analyticalUsage: "Dimensión para desagregar ventas por unidad de negocio." },
      { name: "quantity", type: "Int", isRequired: true, defaultValue: "1", description: "Cantidad de piezas", analyticalUsage: "Volumen físico vendido." },
      { name: "materialId", type: "String?", isFk: true, description: "ID de material de corte", analyticalUsage: "Join con Material para análisis de mermas y familias." },
      { name: "productId", type: "String?", isFk: true, description: "ID de producto Doble Vela", analyticalUsage: "Join con Product para rotación de catálogo." },
      { name: "width", type: "Float?", description: "Ancho de la pieza en cm o mm", analyticalUsage: "Cálculo de área consumida." },
      { name: "height", type: "Float?", description: "Alto de la pieza en cm o mm", analyticalUsage: "Cálculo de área consumida." },
      { name: "thickness", type: "Float?", description: "Espesor del material (ej. 3mm, 5mm)", analyticalUsage: "Segmentación técnica de consumo." },
      { name: "cutTime", type: "Float?", description: "Minutos de corte calculados", analyticalUsage: "Capacidad instalada del taller y OEE." },
      { name: "engraveTime", type: "Float?", description: "Minutos de grabado calculados", analyticalUsage: "Capacidad instalada y desgaste de tubos láser." },
      { name: "machineType", type: "String?", description: "Tipo de máquina (CO2, Fibra, UV, Router)", analyticalUsage: "Rentabilidad por tipo de activo productivo." },
      { name: "materialCost", type: "Float?", defaultValue: "0", description: "Costo puro de la materia prima", analyticalUsage: "Estructura del costo (Cost of Goods Sold)." },
      { name: "laserUseCost", type: "Float?", defaultValue: "0", description: "Costo atribuido al desgaste de tubo y energía", analyticalUsage: "Amortización de maquinaria." },
      { name: "realCost", type: "Float?", defaultValue: "0", description: "Costo real total de la partida", analyticalUsage: "Costo de producción unitario." },
      { name: "suggestedPrice", type: "Float?", defaultValue: "0", description: "Precio sugerido por el algoritmo matemático", analyticalUsage: "Comparación de precio de lista vs precio final otorgado." },
      { name: "finalUnitPrice", type: "Float", isRequired: true, defaultValue: "0", description: "Precio unitario pactado con el cliente", analyticalUsage: "Precio promedio de venta (ASP)." },
      { name: "totalAmount", type: "Float", isRequired: true, defaultValue: "0", description: "Total de la partida (quantity * finalUnitPrice)", analyticalUsage: "Ingreso bruto por partida." }
    ]
  },
  {
    id: "client",
    name: "Client (Clientes & Empresas)",
    dbTable: "Client",
    domain: "VENTAS_CLIENTES",
    domainLabel: "Ventas y Clientes",
    description: "Registro canónico de clientes individuales y corporativos, contactos comerciales e información fiscal.",
    analyticalPurpose: "Análisis de retención (Cohortes), Customer Lifetime Value (LTV), recurrencia de compra y concentración de clientes (Regla de Pareto 80/20).",
    keyMetrics: [
      "Customer Lifetime Value (LTV histórico)",
      "Recurrencia de pedidos por cliente",
      "Concentración de cartera (Top 10 clientes generan X% de ventas)",
      "Días promedio entre recompras"
    ],
    relations: [
      { targetModel: "Quote", type: "1:N", foreignKey: "clientId", description: "Cotizaciones realizadas por este cliente" },
      { targetModel: "WhatsAppContact", type: "1:N", foreignKey: "clientId", description: "Números telefónicos de WhatsApp vinculados" },
      { targetModel: "FinancialTransaction", type: "1:N", foreignKey: "clientId", description: "Pagos y transferencias directas del cliente" },
      { targetModel: "Receipt", type: "1:N", foreignKey: "clientId", description: "Recibos emitidos a nombre del cliente" },
      { targetModel: "PaymentRequest", type: "1:N", foreignKey: "clientId", description: "Solicitudes de cobro activas" }
    ],
    fields: [
      { name: "id", type: "String (UUID)", isPk: true, isRequired: true, description: "ID único del cliente", analyticalUsage: "Llave primaria dimensional para análisis de clientes." },
      { name: "name", type: "String", isRequired: true, description: "Nombre de contacto o razón social", analyticalUsage: "Etiqueta para reportes y tablas." },
      { name: "company", type: "String?", description: "Empresa o marca", analyticalUsage: "Segmentación B2B vs B2C." },
      { name: "email", type: "String?", description: "Correo electrónico del cliente", analyticalUsage: "Canal de contacto y de-duplicación." },
      { name: "phone", type: "String?", description: "Teléfono principal", analyticalUsage: "Cruce con números de WhatsApp." },
      { name: "rfc", type: "String?", description: "Registro Federal de Contribuyentes (México)", analyticalUsage: "Segmentación fiscal (Personas Morales vs Físicas)." },
      { name: "active", type: "Boolean", isRequired: true, defaultValue: "true", description: "Si el cliente está activo", analyticalUsage: "Filtro para clientes activos vs inactivos (Churn)." },
      { name: "createdAt", type: "DateTime", isRequired: true, description: "Fecha de registro en el CRM", analyticalUsage: "Base para análisis de cohortes de adquisición." }
    ]
  },
  {
    id: "financial-transaction",
    name: "FinancialTransaction (Flujo de Caja)",
    dbTable: "FinancialTransaction",
    domain: "TESORERIA_FINANZAS",
    domainLabel: "Finanzas & Cobranza",
    description: "Movimientos contables operativos del CRM: Ingresos, anticipos, liquidaciones y gastos asociados a proyectos o gastos fijos de taller.",
    analyticalPurpose: "Fuente de verdad de Tesorería. Permite calcular el Estado de Resultados (P&L), flujo de caja libre, gastos operativos por categoría y conciliación bancaria.",
    keyMetrics: [
      "Flujo de caja neto (Ingresos - Gastos)",
      "Desglose de gastos por categoría (Material, Nómina, Maquinaria, Renta)",
      "Proporción de cobros por método de pago (Transferencia vs Efectivo)",
      "Gastos directos por proyecto vs gastos operativos generales"
    ],
    relations: [
      { targetModel: "Quote", type: "N:1", foreignKey: "quoteId", description: "Cotización asociada (si el gasto/ingreso es de un proyecto)" },
      { targetModel: "Client", type: "N:1", foreignKey: "clientId", description: "Cliente emisor o receptor del fondo" },
      { targetModel: "User", type: "N:1", foreignKey: "createdById", description: "Usuario que registró la transacción" }
    ],
    fields: [
      { name: "id", type: "String (UUID)", isPk: true, isRequired: true, description: "ID único del movimiento", analyticalUsage: "Identificador atómico contable." },
      { name: "type", type: "String", isRequired: true, description: "GASTO_OPERATIVO | GASTO_PROYECTO | INGRESO | ANTICIPO | LIQUIDACION | AJUSTE", analyticalUsage: "Dimensión contable para clasificar débitos y créditos." },
      { name: "category", type: "String", isRequired: true, description: "Categoría de gasto o ingreso (ej. 'ACRILICO', 'COMBUSTIBLE', 'ANTICIPO_CLIENTE')", analyticalUsage: "Desglose por rubros en tableros de control financiero." },
      { name: "amount", type: "Float", isRequired: true, description: "Monto neto del movimiento", analyticalUsage: "Measure financiera principal." },
      { name: "taxAmount", type: "Float", isRequired: true, defaultValue: "0", description: "Monto de IVA desglosado", analyticalUsage: "Control de balance de IVA retenido vs trasladado." },
      { name: "description", type: "String", isRequired: true, description: "Detalle del movimiento", analyticalUsage: "Auditoría contable y búsqueda semántica." },
      { name: "date", type: "DateTime", isRequired: true, description: "Fecha efectiva del movimiento de dinero", analyticalUsage: "Eje temporal del flujo de efectivo (Cash Flow Timeline)." },
      { name: "paymentMethod", type: "String?", description: "efectivo | transferencia | tarjeta | deposito | otro", analyticalUsage: "Mix de canales de recaudación." },
      { name: "quoteId", type: "String?", isFk: true, description: "ID de cotización si corresponde a un proyecto", analyticalUsage: "Join para calcular costo real del proyecto (Project P&L)." },
      { name: "isDeleted", type: "Boolean", isRequired: true, defaultValue: "false", description: "Soft delete para auditoría", analyticalUsage: "SIEMPRE filtrar where isDeleted = false para reportes." },
      { name: "status", type: "String", isRequired: true, defaultValue: "'ACTIVO'", description: "ACTIVO | ANULADO", analyticalUsage: "Filtro de transacciones válidas." }
    ]
  },
  {
    id: "receipt",
    name: "Receipt (Recibos de Pago y Anticipos)",
    dbTable: "Receipt",
    domain: "TESORERIA_FINANZAS",
    domainLabel: "Finanzas & Cobranza",
    description: "Comprobantes foliados de anticipo y liquidación expedidos directamente al cliente como garantía de pago.",
    analyticalPurpose: "Medición de velocidad de cobranza de anticipos vs liquidaciones, control de saldos insolutos y auditoría física de cobros.",
    keyMetrics: [
      "Suma de anticipos recaudados",
      "Saldo insoluto promedio por cliente",
      "Tasa de liquidación completa (status = PAID)",
      "Proporción de anticipo promedio pactado (% del total)"
    ],
    relations: [
      { targetModel: "Client", type: "N:1", foreignKey: "clientId", description: "Cliente beneficiario del recibo" },
      { targetModel: "User", type: "N:1", foreignKey: "userId", description: "Vendedor o cajero emisor" }
    ],
    fields: [
      { name: "id", type: "String (UUID)", isPk: true, isRequired: true, description: "ID único del recibo", analyticalUsage: "Identificador primario de comprobante." },
      { name: "folio", type: "String", isRequired: true, description: "Folio único consecutivo (ej. REC-00123)", analyticalUsage: "Trazabilidad con comprobantes físicos entregados." },
      { name: "clientId", type: "String?", isFk: true, description: "ID del cliente", analyticalUsage: "Join con Client para estado de cuenta." },
      { name: "project", type: "String", isRequired: true, description: "Nombre del trabajo amparado", analyticalUsage: "Referencia comercial rápida." },
      { name: "total", type: "Float", isRequired: true, defaultValue: "0", description: "Total pactado del trabajo", analyticalUsage: "Base de cálculo de saldo." },
      { name: "advance", type: "Float", isRequired: true, defaultValue: "0", description: "Monto del anticipo abonado", analyticalUsage: "Medida de flujo recibido." },
      { name: "balance", type: "Float", isRequired: true, defaultValue: "0", description: "Restante por liquidar al entregar", analyticalUsage: "Cuentas por cobrar vivas a nivel recibo." },
      { name: "paymentMethod", type: "String", isRequired: true, defaultValue: "'EFECTIVO'", description: "EFECTIVO, TRANSFERENCIA, TARJETA, DEPOSITO", analyticalUsage: "Auditoría de arqueo de caja." },
      { name: "status", type: "String", isRequired: true, defaultValue: "'PENDING'", description: "PENDING (pendiente de liquidar), PAID (liquidado)", analyticalUsage: "Filtro de recibos liquidados vs pendientes." },
      { name: "quoteId", type: "String?", description: "ID de la cotización vinculada", analyticalUsage: "Conciliación con Quote." }
    ]
  },
  {
    id: "whatsapp-contact",
    name: "WhatsAppContact (Contactos de WhatsApp)",
    dbTable: "WhatsAppContact",
    domain: "OMNICANAL_IA",
    domainLabel: "WhatsApp & Agente IA",
    description: "Hilos y perfiles de WhatsApp conectados a la API de Meta. Controla el switch de automatización del bot y el enlace con el cliente.",
    analyticalPurpose: "Embudos de adquisición omnicanal. Permite calcular el costo de adquisición de clientes (CAC) por WhatsApp y evaluar la efectividad del bot autónomo.",
    keyMetrics: [
      "Total de contactos únicos captados por WhatsApp",
      "% de contactos con botMode activo vs control humano",
      "Tasa de conversión de contacto WhatsApp a Cotización",
      "Antigüedad promedio del lead antes de comprar"
    ],
    relations: [
      { targetModel: "Client", type: "N:1", foreignKey: "clientId", description: "Cliente vinculado tras calificar el lead" },
      { targetModel: "WhatsAppMessage", type: "1:N", foreignKey: "contactId", description: "Historial completo de mensajes de chat" },
      { targetModel: "Quote", type: "1:N", foreignKey: "contactId", description: "Cotizaciones originadas desde este chat" },
      { targetModel: "AiUsageLog", type: "1:N", foreignKey: "contactId", description: "Consumo de tokens de IA invertidos en este contacto" }
    ],
    fields: [
      { name: "id", type: "String (UUID)", isPk: true, isRequired: true, description: "ID único de contacto", analyticalUsage: "Llave de enlace con eventos conversacionales." },
      { name: "phone", type: "String", isRequired: true, description: "Número E.164 con lada internacional", analyticalUsage: "Identificador natural y llave de de-duplicación." },
      { name: "name", type: "String?", description: "Nombre de perfil en WhatsApp", analyticalUsage: "Identificación de contacto." },
      { name: "botMode", type: "Boolean", isRequired: true, defaultValue: "true", description: "True = Agente IA responde; False = Intervención humana", analyticalUsage: "Auditoría de automatización vs intervención manual." },
      { name: "clientId", type: "String?", isFk: true, description: "ID de cliente si ya fue formalizado en el CRM", analyticalUsage: "Join clave para medir conversión a cliente formal." }
    ]
  },
  {
    id: "whatsapp-message",
    name: "WhatsAppMessage (Mensajería de Chat)",
    dbTable: "WhatsAppMessage",
    domain: "OMNICANAL_IA",
    domainLabel: "WhatsApp & Agente IA",
    description: "Registro de cada mensaje individual entrante y saliente, incluyendo multimedia y confirmaciones de entrega de Meta.",
    analyticalPurpose: "Análisis conversacional, tiempos de respuesta (SLA), frecuencia de mensajes por lead y análisis de sentimiento / palabras clave frecuentes.",
    keyMetrics: [
      "Mensajes enviados vs recibidos (Ratio Inbound/Outbound)",
      "Tiempo de primera respuesta (First Response Time)",
      "Distribución de tipos de mensaje (Texto, Imágenes, Audio)",
      "Tasa de entrega exitosa (status = DELIVERED / READ)"
    ],
    relations: [
      { targetModel: "WhatsAppContact", type: "N:1", foreignKey: "contactId", description: "Contacto al que pertenece el mensaje" }
    ],
    fields: [
      { name: "id", type: "String (UUID)", isPk: true, isRequired: true, description: "ID interno de base de datos", analyticalUsage: "Llave primaria técnica." },
      { name: "contactId", type: "String", isFk: true, isRequired: true, description: "ID del contacto", analyticalUsage: "Join con WhatsAppContact." },
      { name: "messageId", type: "String", isRequired: true, description: "ID de Meta (wamid...)", analyticalUsage: "De-duplicación y webhook correlation." },
      { name: "direction", type: "String", isRequired: true, description: "'INBOUND' (cliente) o 'OUTBOUND' (nosotros/bot)", analyticalUsage: "Dimensión fundamental para separar peticiones de respuestas." },
      { name: "type", type: "String", isRequired: true, description: "'TEXT', 'IMAGE', 'AUDIO', 'DOCUMENT'", analyticalUsage: "Métrica de riqueza multimedia en la comunicación." },
      { name: "content", type: "String?", description: "Cuerpo del mensaje en texto", analyticalUsage: "NLP, minería de texto y detección de intenciones." },
      { name: "status", type: "String", isRequired: true, defaultValue: "'SENT'", description: "SENT, DELIVERED, READ, FAILED", analyticalUsage: "Embudo de entrega técnica de WhatsApp." },
      { name: "timestamp", type: "DateTime", isRequired: true, defaultValue: "now()", description: "Momento exacto del envío o recepción", analyticalUsage: "Eje temporal para SLA y horarios pico." }
    ]
  },
  {
    id: "ai-usage-log",
    name: "AiUsageLog (Consumo de Inteligencia Artificial)",
    dbTable: "AiUsageLog",
    domain: "OMNICANAL_IA",
    domainLabel: "WhatsApp & Agente IA",
    description: "Bitácora inmutable de llamadas al LLM (Gemini): tokens de entrada, salida y costo calculado en USD.",
    analyticalPurpose: "Control de costos de infraestructura de IA, ROI del bot y monitoreo de eficiencia de prompts.",
    keyMetrics: [
      "Costo total mensual en USD de modelos de IA",
      "Promedio de tokens consumidos por interacción",
      "Costo de IA por cotización generada",
      "Agentes con mayor volumen de llamadas (Sales vs Secretary)"
    ],
    relations: [
      { targetModel: "WhatsAppContact", type: "N:1", foreignKey: "contactId", description: "Contacto que motivó la inferencia del bot" }
    ],
    fields: [
      { name: "id", type: "String (UUID)", isPk: true, isRequired: true, description: "ID único del log", analyticalUsage: "Identificador de evento de inferencia." },
      { name: "agentName", type: "String", isRequired: true, description: "Nombre del agente (ej. 'Secretary', 'Sales')", analyticalUsage: "Desglose por rol o prompt de IA." },
      { name: "contactId", type: "String?", isFk: true, description: "ID del contacto de WhatsApp", analyticalUsage: "Cálculo de costo de IA atribuido por cliente." },
      { name: "inputTokens", type: "Int", isRequired: true, description: "Tokens del prompt y contexto", analyticalUsage: "Monitoreo del tamaño del contexto RAG." },
      { name: "outputTokens", type: "Int", isRequired: true, description: "Tokens generados por el LLM", analyticalUsage: "Medición de longitud de respuestas generadas." },
      { name: "totalTokens", type: "Int", isRequired: true, description: "Suma total de tokens procesados", analyticalUsage: "Métrica principal de volumen computacional." },
      { name: "estimatedCost", type: "Float", isRequired: true, defaultValue: "0", description: "Costo en USD calculado con base en tarifas del modelo", analyticalUsage: "Measure de costo financiero directo en dólares." },
      { name: "createdAt", type: "DateTime", isRequired: true, defaultValue: "now()", description: "Momento de la llamada a la API de IA", analyticalUsage: "Evolución temporal del gasto de IA." }
    ]
  },
  {
    id: "material",
    name: "Material (Catálogo de Placas & Láminas)",
    dbTable: "Material",
    domain: "OPERACIONES_TALLER",
    domainLabel: "Taller & Costeo Láser",
    description: "Catálogo de materias primas para corte láser (Acrílico, MDF, Trovicel, etc.), dimensiones de hojas, precios por cm² y factores de guarda.",
    analyticalPurpose: "Cálculo del costo de materia prima, análisis de mermas, rotación de familias de materiales y rentabilidad por tipo de sustrato.",
    keyMetrics: [
      "Material más vendido por volumen (cm² y partidas)",
      "Margen de ganancia por familia de material",
      "Impacto del porcentaje de guarda en el precio final"
    ],
    relations: [
      { targetModel: "MaterialCategory", type: "N:1", foreignKey: "categoryId", description: "Categoría (Acrílicos, Maderas, Metales)" },
      { targetModel: "QuoteConcept", type: "1:N", foreignKey: "materialId", description: "Partidas donde se utilizó el material" }
    ],
    fields: [
      { name: "id", type: "String (UUID)", isPk: true, isRequired: true, description: "ID único del material", analyticalUsage: "Llave primaria técnica." },
      { name: "name", type: "String", isRequired: true, description: "Nombre comercial (ej. Acrílico Cristal 3mm)", analyticalUsage: "Dimensión descriptiva del material." },
      { name: "family", type: "String?", description: "Familia química o técnica", analyticalUsage: "Agrupador para tableros de inventario." },
      { name: "color", type: "String?", description: "Color de la placa", analyticalUsage: "Tendencias de color más cotizadas." },
      { name: "thickness", type: "Float?", description: "Espesor en milímetros", analyticalUsage: "Segmentación por calibre de corte." },
      { name: "sheetPrice", type: "Float?", description: "Precio de compra de la lámina completa", analyticalUsage: "Costo unitario de adquisición." },
      { name: "guardPercentage", type: "Float?", description: "% de merma/guarda aplicado en el costeo", analyticalUsage: "Factor de protección de merma." },
      { name: "pricePerCm2", type: "Float?", description: "Precio calculado por cm²", analyticalUsage: "Unidad estándar de costo por área." },
      { name: "active", type: "Boolean", isRequired: true, defaultValue: "true", description: "Si está activo para cotizar", analyticalUsage: "Filtro de catálogo vigente." }
    ]
  },
  {
    id: "survey-response",
    name: "SurveyResponse (Calidad & NPS)",
    dbTable: "SurveyResponse",
    domain: "GESTION_EQUIPO",
    domainLabel: "Gestión & Calidad",
    description: "Evaluaciones de satisfacción enviadas a clientes post-entrega de la cotización con puntajes numéricos de 1 a 5 y retroalimentación en texto.",
    analyticalPurpose: "Medición de satisfacción del cliente, cálculo del Net Promoter Score (NPS), correlación de satisfacción vs vendedor y detección temprana de quejas.",
    keyMetrics: [
      "Calificación promedio global (1 a 5)",
      "Net Promoter Score (NPS) estimado",
      "Tasa de respuesta de encuestas de clientes",
      "Correlación entre tiempo de entrega y satisfacción"
    ],
    relations: [
      { targetModel: "Quote", type: "1:1", foreignKey: "quoteId", description: "Cotización evaluada" },
      { targetModel: "SurveyAnswer", type: "1:N", foreignKey: "responseId", description: "Respuestas individuales a preguntas específicas" }
    ],
    fields: [
      { name: "id", type: "String (UUID)", isPk: true, isRequired: true, description: "ID único de la respuesta", analyticalUsage: "Llave de registro de encuesta." },
      { name: "quoteId", type: "String", isFk: true, isRequired: true, description: "ID de la cotización evaluada", analyticalUsage: "Join con Quote para cruzar ventas con satisfacción." },
      { name: "averageScore", type: "Float", isRequired: true, defaultValue: "0", description: "Promedio ponderado de la evaluación (1.0 a 5.0)", analyticalUsage: "KPI directo de satisfacción de cliente (CSAT)." },
      { name: "feedbackText", type: "String?", description: "Comentarios libres del cliente", analyticalUsage: "Minería de texto de retroalimentación cualitativa." },
      { name: "createdAt", type: "DateTime", isRequired: true, defaultValue: "now()", description: "Fecha de contestación de la encuesta", analyticalUsage: "Evolución temporal del CSAT/NPS." }
    ]
  },
  {
    id: "task",
    name: "Task (Kanban de Taller & Equipo)",
    dbTable: "Task",
    domain: "GESTION_EQUIPO",
    domainLabel: "Gestión & Calidad",
    description: "Tablero de trabajo interno del equipo: órdenes de trabajo en taller, tareas de diseño y seguimiento de compras.",
    analyticalPurpose: "Medición de productividad del personal, cuellos de botella (BLOCKED), horas estimadas vs reales (Story Points) y cumplimiento de fechas de entrega.",
    keyMetrics: [
      "Tiempo de ciclo de tareas (Cycle Time)",
      "Tareas bloqueadas y motivos frecuentes de bloqueo (blockerReason)",
      "Puntos de esfuerzo completados por usuario",
      "Tasa de cumplimiento de fechas de entrega (dueDate)"
    ],
    relations: [
      { targetModel: "User", type: "N:1", foreignKey: "createdById", description: "Usuario creador de la tarea" },
      { targetModel: "TaskAssignee", type: "1:N", foreignKey: "taskId", description: "Miembros del equipo asignados" },
      { targetModel: "SubTask", type: "1:N", foreignKey: "taskId", description: "Subtareas o checklists de la tarea" }
    ],
    fields: [
      { name: "id", type: "String (UUID)", isPk: true, isRequired: true, description: "ID único de la tarea", analyticalUsage: "Llave técnica de tarea." },
      { name: "title", type: "String", isRequired: true, description: "Título descriptivo de la actividad", analyticalUsage: "Nombre del trabajo operativo." },
      { name: "status", type: "String", isRequired: true, defaultValue: "'PENDING'", description: "BACKLOG | PENDING | IN_PROGRESS | BLOCKED | DONE", analyticalUsage: "Dimensión de estado para embudos Kanban." },
      { name: "priority", type: "String", isRequired: true, defaultValue: "'NORMAL'", description: "LOW | NORMAL | HIGH", analyticalUsage: "Priorización operativa." },
      { name: "points", type: "Int", isRequired: true, defaultValue: "0", description: "Puntos de esfuerzo (1 punto = 1 hora estimada)", analyticalUsage: "Carga de trabajo estimada (Workload)." },
      { name: "progress", type: "Int", isRequired: true, defaultValue: "0", description: "% de avance reportado (0 a 100)", analyticalUsage: "Progreso en tiempo real de órdenes de taller." },
      { name: "blockerReason", type: "String?", description: "Motivo obligatorio cuando status = BLOCKED", analyticalUsage: "Análisis de causas raíz de retrasos en taller." },
      { name: "dueDate", type: "DateTime?", description: "Fecha límite de entrega", analyticalUsage: "Métrica de entregas a tiempo (On-Time Delivery)." }
    ]
  }
];

export const KPI_PLAYBOOK: KpiPlaybookItem[] = [
  {
    name: "Tasa de Bateo Comercial (Quote Win Rate)",
    category: "Ventas",
    description: "Porcentaje de cotizaciones emitidas que terminaron en venta aprobada o entregada.",
    formula: "(Cotizaciones con status 'APPROVED' o 'DELIVERED') / (Total de cotizaciones emitidas activas) * 100",
    sourceTables: ["Quote"],
    sqlSnippet: `SELECT 
  DATE_FORMAT(createdAt, '%Y-%m') AS Mes,
  COUNT(*) AS Total_Cotizaciones,
  SUM(CASE WHEN status IN ('APPROVED', 'IN_PRODUCTION', 'DELIVERED') THEN 1 ELSE 0 END) AS Cotizaciones_Ganadas,
  ROUND(SUM(CASE WHEN status IN ('APPROVED', 'IN_PRODUCTION', 'DELIVERED') THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) AS Win_Rate_Pct
FROM Quote
WHERE active = 1 AND status != 'DRAFT'
GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
ORDER BY Mes DESC;`,
    businessImpact: "Permite evaluar la efectividad del equipo de ventas y la competitividad de los precios en el mercado."
  },
  {
    name: "Margen Real vs Margen Estimado (Varianza de Utilidad)",
    category: "Finanzas & Costeo",
    description: "Compara el margen teórico proyectado por el cotizador contra la ganancia líquida real tras registrar cobros y gastos del proyecto.",
    formula: "Varianza = (Quote.realUtilityTotal - Quote.estimatedUtility)",
    sourceTables: ["Quote", "FinancialTransaction"],
    sqlSnippet: `SELECT 
  q.folio,
  q.project,
  q.total AS Venta_Total,
  q.estimatedUtility AS Utilidad_Estimada,
  q.realAmountCollected AS Cobrado_Real,
  COALESCE(SUM(ft.amount), 0) AS Gastos_Registrados,
  (COALESCE(q.realAmountCollected, 0) - COALESCE(SUM(ft.amount), 0)) AS Utilidad_Real_Calculada,
  ROUND(((COALESCE(q.realAmountCollected, 0) - COALESCE(SUM(ft.amount), 0)) - q.estimatedUtility), 2) AS Desviacion_Utilidad
FROM Quote q
LEFT JOIN FinancialTransaction ft ON ft.quoteId = q.id AND ft.type = 'GASTO_PROYECTO' AND ft.isDeleted = 0
WHERE q.active = 1 AND q.status = 'DELIVERED'
GROUP BY q.id
ORDER BY q.createdAt DESC
LIMIT 50;`,
    businessImpact: "Detecta mermas no cobradas, incrementos imprevistos de material o fugas operativas en taller."
  },
  {
    name: "Costo de Infraestructura de IA por Contacto de WhatsApp",
    category: "Omnicanalidad & IA",
    description: "Gasto en tokens de la API de Google Gemini atribuido a cada usuario que conversó por WhatsApp.",
    formula: "Suma de AiUsageLog.estimatedCost agrupado por WhatsAppContact.id",
    sourceTables: ["AiUsageLog", "WhatsAppContact", "Client", "Quote"],
    sqlSnippet: `SELECT 
  c.phone,
  c.name AS Contacto,
  COALESCE(cl.name, 'No registrado como cliente') AS Cliente_Formal,
  COUNT(l.id) AS Total_Interacciones_IA,
  SUM(l.totalTokens) AS Tokens_Totales,
  ROUND(SUM(l.estimatedCost), 4) AS Costo_Total_USD,
  COUNT(DISTINCT q.id) AS Cotizaciones_Generadas,
  COALESCE(SUM(q.total), 0) AS Venta_Total_Generada
FROM WhatsAppContact c
LEFT JOIN AiUsageLog l ON l.contactId = c.id
LEFT JOIN Client cl ON cl.id = c.clientId
LEFT JOIN Quote q ON q.contactId = c.id AND q.active = 1 AND q.status IN ('APPROVED', 'DELIVERED')
GROUP BY c.id
ORDER BY Costo_Total_USD DESC
LIMIT 50;`,
    businessImpact: "Evalúa el Retorno de Inversión (ROI) de la automatización por IA: si gastar $0.05 USD en tokens generó una venta de $5,000 MXN."
  },
  {
    name: "Cuentas por Cobrar & Días de Cartera (DSO)",
    category: "Tesorería",
    description: "Monto total pendiente de liquidar por clientes en cotizaciones que ya fueron aprobadas o producidas.",
    formula: "Saldo Pendiente = SUM(Quote.total - COALESCE(Quote.realAmountCollected, 0))",
    sourceTables: ["Quote", "Client"],
    sqlSnippet: `SELECT 
  c.name AS Cliente,
  c.company AS Empresa,
  COUNT(q.id) AS Cotizaciones_Pendientes,
  ROUND(SUM(q.total), 2) AS Venta_Total_Acumulada,
  ROUND(SUM(COALESCE(q.realAmountCollected, 0)), 2) AS Cobrado_Acumulado,
  ROUND(SUM(q.total - COALESCE(q.realAmountCollected, 0)), 2) AS Saldo_Por_Cobrar
FROM Quote q
JOIN Client c ON c.id = q.clientId
WHERE q.active = 1 
  AND q.paymentStatus IN ('PENDING', 'PARTIAL')
  AND q.status NOT IN ('CANCELLED', 'REJECTED', 'DRAFT')
GROUP BY c.id
HAVING Saldo_Por_Cobrar > 0
ORDER BY Saldo_Por_Cobrar DESC;`,
    businessImpact: "Herramienta clave para el equipo de cobranza y prevención de problemas de liquidez."
  },
  {
    name: "Materiales Más Rentables & Consumo de Taller",
    category: "Operaciones Láser",
    description: "Identifica qué familias de materiales generan mayor facturación y mayor tiempo de corte.",
    formula: "Suma de QuoteConcept.totalAmount y cutTime agrupado por Material.name",
    sourceTables: ["QuoteConcept", "Material", "Quote"],
    sqlSnippet: `SELECT 
  m.name AS Material,
  m.family AS Familia,
  m.thickness AS Espesor_mm,
  COUNT(qc.id) AS Partidas_Cotizadas,
  ROUND(SUM(qc.quantity), 0) AS Piezas_Totales,
  ROUND(SUM(qc.cutTime * qc.quantity), 1) AS Minutos_Corte_Totales,
  ROUND(SUM(qc.engraveTime * qc.quantity), 1) AS Minutos_Grabado_Totales,
  ROUND(SUM(qc.totalAmount), 2) AS Facturacion_Total
FROM QuoteConcept qc
JOIN Material m ON m.id = qc.materialId
JOIN Quote q ON q.id = qc.quoteId
WHERE q.active = 1 AND q.status IN ('APPROVED', 'IN_PRODUCTION', 'DELIVERED')
GROUP BY m.id
ORDER BY Facturacion_Total DESC;`,
    businessImpact: "Optimiza la compra por volumen a proveedores de placas de acrílico/MDF y planea mantenimiento preventivo de láseres."
  }
];

export interface SystemArchitectureSpec {
  hosting: {
    provider: string;
    serverType: string;
    environmentUrl: string;
    runtime: string;
    proxy: string;
    supervisor: string;
    notes: string;
  };
  database: {
    engine: string;
    hostProduction: string;
    hostLocal: string;
    port: number;
    databaseName: string;
    orm: string;
    connectionLimits: string;
    idleTimeout: string;
    specialRules: string;
  };
  aiAgent: {
    primaryModel: string;
    sdk: string;
    vectorDb: string;
    vectorIndex: string;
    ragMethod: string;
    tokenLogging: string;
    humanHandoff: string;
  };
  communications: {
    whatsapp: string;
    websockets: string;
    emailIncoming: string;
    emailOutgoing: string;
  };
  packages: {
    name: string;
    version: string;
    category: "Framework & Core" | "Base de Datos & ORM" | "Inteligencia Artificial" | "Tiempo Real & Comunicación" | "Archivos & Reportes" | "UI & Estilos";
    purpose: string;
  }[];
}

export const TECH_STACK_SPEC: SystemArchitectureSpec = {
  hosting: {
    provider: "Railway Cloud Platform (PaaS) / Node.js Container Hosting",
    serverType: "Railway Linux Container (Nixpacks / OCI Runtime)",
    environmentUrl: "https://app.laserinova.com",
    runtime: "Node.js 20.x (LTS)",
    proxy: "Railway Edge Proxy con SSL/TLS automático y Custom Domain (app.laserinova.com)",
    supervisor: "Railway Deployment Orchestrator con Healthchecks y auto-restart en fallo",
    notes: "Todas las rutas que consultan base de datos obligan export const dynamic = 'force-dynamic' para garantizar renderizado dinámico en tiempo real y evitar bloqueos en el build."
  },
  database: {
    engine: "MySQL 8.0 / MariaDB Enterprise",
    hostProduction: "Railway Managed MySQL / Hostinger Cloud DB",
    hostLocal: "localhost:3306 (Docker / MySQL Community Server)",
    port: 3306,
    databaseName: "railway_crm_laserinova (u826363020_crm_laser_inov)",
    orm: "Prisma Client v6.4.1 (Singleton Pattern en @/lib/prisma)",
    connectionLimits: "1 conexión en desarrollo local, 3 conexiones en producción (?connection_limit=3)",
    idleTimeout: "idleTimeout >= 60,000 ms (60 segundos) para optimizar el pool de conexiones",
    specialRules: "Limpieza automática de caracteres especiales y backslashes en contraseñas de .env."
  },
  aiAgent: {
    primaryModel: "Google Gemini 2.0 / 1.5 Flash & Pro (Multimodal: Texto, Fotos de Diseños y Audio)",
    sdk: "@google/generative-ai (v0.24.1)",
    vectorDb: "Pinecone Vector Database (@pinecone-database/pinecone v9.0.0)",
    vectorIndex: "agent-bot-li (Embeddings de políticas de venta, catálogo Doble Vela y costeo)",
    ragMethod: "Retrieval-Augmented Generation (RAG) combinando Pinecone con la tabla AgentRule de MySQL",
    tokenLogging: "Tabla inmutable AiUsageLog con registro de inputTokens, outputTokens y costo en USD",
    humanHandoff: "Switch booleano WhatsAppContact.botMode (si el vendedor interviene, el bot se silencia automáticamente)"
  },
  communications: {
    whatsapp: "Meta WhatsApp Cloud API v21 oficial (Webhooks entrantes y mensajes salientes vía Graph API)",
    websockets: "Pusher Channels (pusher v5.3 / pusher-js v8.6) en Cluster us2 para sincronización en milisegundos",
    emailIncoming: "Hostinger Business Mail IMAP (imap.hostinger.com:993 SSL) procesado con imapflow y mailparser",
    emailOutgoing: "Hostinger Business Mail SMTP (smtp.hostinger.com:465 SSL) enviado con nodemailer"
  },
  packages: [
    { name: "next", version: "^16.3.8", category: "Framework & Core", purpose: "Framework React fullstack con App Router, Server Components y Server Actions" },
    { name: "react", version: "19.2.4", category: "Framework & Core", purpose: "Librería base de componentes e interactividad de cliente" },
    { name: "react-dom", version: "19.2.4", category: "Framework & Core", purpose: "Renderizador DOM para React 19" },
    { name: "typescript", version: "^5", category: "Framework & Core", purpose: "Tipado estático estricto en toda la aplicación" },
    { name: "zod", version: "^4.5.4", category: "Framework & Core", purpose: "Validador perimetral de esquemas y payloads de mutación" },
    { name: "next-auth", version: "^4.24.15", category: "Framework & Core", purpose: "Gestión de sesiones JWT y autenticación basada en roles (RBAC)" },
    { name: "prisma", version: "^6.4.1", category: "Base de Datos & ORM", purpose: "CLI de migraciones y modelado de datos schema.prisma" },
    { name: "@prisma/client", version: "^6.4.1", category: "Base de Datos & ORM", purpose: "Cliente de acceso a MySQL con tipos generados automáticamente" },
    { name: "@google/generative-ai", version: "^0.24.1", category: "Inteligencia Artificial", purpose: "SDK oficial de Google para inferencia de modelos Gemini" },
    { name: "@pinecone-database/pinecone", version: "^9.0.0", category: "Inteligencia Artificial", purpose: "Cliente de búsqueda vectorial de baja latencia para el RAG del bot" },
    { name: "pusher", version: "^5.3.4", category: "Tiempo Real & Comunicación", purpose: "SDK de servidor para emitir eventos WebSocket en tiempo real" },
    { name: "pusher-js", version: "^8.6.0", category: "Tiempo Real & Comunicación", purpose: "Cliente de navegador para escuchar eventos de chat en vivo y alertas" },
    { name: "nodemailer", version: "^7.0.13", category: "Tiempo Real & Comunicación", purpose: "Envío de correos transaccionales y cotizaciones por SMTP" },
    { name: "imapflow", version: "^1.3.3", category: "Tiempo Real & Comunicación", purpose: "Cliente IMAP moderno de alto rendimiento para sincronización de correos" },
    { name: "mailparser", version: "^3.9.8", category: "Tiempo Real & Comunicación", purpose: "Parser MIME de correos entrantes y decodificación de adjuntos" },
    { name: "exceljs", version: "^4.4.0", category: "Archivos & Reportes", purpose: "Generación de libros y hojas de cálculo Excel (.xlsx) con estilos" },
    { name: "jspdf", version: "^4.2.1", category: "Archivos & Reportes", purpose: "Generación de cotizaciones y recibos oficiales en formato PDF" },
    { name: "jspdf-autotable", version: "^5.0.7", category: "Archivos & Reportes", purpose: "Creación de tablas paginadas para PDFs de cotizaciones" },
    { name: "papaparse", version: "^5.7.0", category: "Archivos & Reportes", purpose: "Importación y exportación de archivos planos CSV" },
    { name: "tailwindcss", version: "^4", category: "UI & Estilos", purpose: "Motor de utilidades CSS moderno de última generación" },
    { name: "lucide-react", version: "^1.8.0", category: "UI & Estilos", purpose: "Iconografía vectorial consistente para la interfaz del CRM" },
    { name: "recharts", version: "^3.9.0", category: "UI & Estilos", purpose: "Gráficas interactivas SVG para tableros de control y analítica" }
  ]
};
