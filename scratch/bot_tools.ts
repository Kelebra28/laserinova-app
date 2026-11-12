import { FunctionDeclaration, SchemaType } from '@google/generative-ai';
const notificar_solicitud_cotizacion: FunctionDeclaration = {
  name: 'notificar_solicitud_cotizacion',
  description: 'Envía los datos recolectados al administrador humano para que autorice y genere la cotización final. IMPORTANTE: NO puedes usar esta herramienta hasta tener los datos técnicos obligatorios: Material, Ancho, Alto y Cantidad. Si falta alguno, pregúntale al cliente antes de llamar a esta función. El nombre y el correo son opcionales: NUNCA dejes de llamarla por no tenerlos.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      project_name: { type: SchemaType.STRING, description: 'Nombre corto del proyecto (ej. "Termos Grabados", "Corte Acrílico")' },
      material: { type: SchemaType.STRING, description: 'Material solicitado por el cliente (Obligatorio)' },
      grosor: { type: SchemaType.STRING, description: 'Grosor del material si aplica (ej. 3mm)' },
      ancho_cm: { type: SchemaType.NUMBER, description: 'Medida del ANCHO en centímetros exactos (Obligatorio)' },
      alto_cm: { type: SchemaType.NUMBER, description: 'Medida del ALTO en centímetros exactos (Obligatorio)' },
      cantidad: { type: SchemaType.INTEGER, description: 'Cantidad de piezas solicitadas por el cliente (Obligatorio)' },
      diseno_incluido: { type: SchemaType.BOOLEAN, description: 'True si el cliente tiene diseño en vectores, False si no.' },
      nombre_cliente: { type: SchemaType.STRING, description: 'Nombre que el cliente te dijo (Opcional: déjalo vacío si no lo dio; el sistema usa su nombre de WhatsApp)' },
      correo_cliente: { type: SchemaType.STRING, description: 'Correo electrónico del cliente (Opcional, puede venir vacío)' },
      tipo_concepto: { type: SchemaType.STRING, description: 'Si el proyecto es un producto del catálogo (ej. Termos, libretas) manda "REVENTA". Si es material suelto manda "CORTE" o "GRABADO".' },
      descripcion_concepto: { type: SchemaType.STRING, description: 'Descripción detallada del concepto (ej. "Termo Space de 550ml con grabado láser")' },
    },
    required: ['project_name', 'material', 'ancho_cm', 'alto_cm', 'cantidad', 'tipo_concepto'],
  }
};

const transferir_a_humano: FunctionDeclaration = {
  name: 'transferir_a_humano',
  description: 'Avisa al equipo humano para que contacte al cliente si se enoja, pide hablar con una persona, o hace preguntas técnicas muy complejas. El bot sigue activo en el chat y sigue contestando.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: { motivo: { type: SchemaType.STRING, description: 'Motivo de la transferencia' } },
    required: ['motivo'],
  }
};

const avisar_duda_al_equipo: FunctionDeclaration = {
  name: 'avisar_duda_al_equipo',
  description: 'Avisa al equipo humano de una duda del cliente que NO puedes responder con los datos del negocio, las reglas ni las herramientas (ej. un material raro, una pregunta técnica puntual, algo que no sabes). El bot sigue activo en el chat. Úsala SOLO en ese caso; no para cotizaciones ni cuando el cliente pide hablar con una persona (para eso está transferir_a_humano).',
  parameters: {
    type: SchemaType.OBJECT,
    properties: { duda: { type: SchemaType.STRING, description: 'La pregunta o duda del cliente, completa y con el contexto necesario para que el equipo pueda contestarla' } },
    required: ['duda'],
  }
};

const buscar_productos_en_catalogo: FunctionDeclaration = {
  name: 'buscar_productos_en_catalogo',
  description: 'Busca productos reales en la base de datos (catálogo) para ofrecerle opciones al cliente. Úsalo cuando el cliente pregunte qué tipos de termos, tazas, libretas u otros artículos promocionales tienes.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: { 
      termino_busqueda: { type: SchemaType.STRING, description: 'Palabra o frase de búsqueda (ej. "termo", "taza azul", "cilindro acero")' },
      pagina: { type: SchemaType.INTEGER, description: 'Página de resultados (usa 1 la primera vez, y 2, 3... si el cliente pide ver "más opciones" o "otros modelos")' }
    },
    required: ['termino_busqueda'],
  }
};

const consultar_colores_producto: FunctionDeclaration = {
  name: 'consultar_colores_producto',
  description: 'Consulta los COLORES y la disponibilidad de un producto concreto del catálogo, y puede mandar la FOTO de un color específico. Úsala cuando el cliente pregunte de qué colores hay un modelo, si lo tienes en otro color, cuánto stock hay, o cuando pida VER un color en particular (ej. "enséñame el marmoleado"): en ese caso pasa también color_foto y la foto de ese color se le manda automáticamente por WhatsApp.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      producto: { type: SchemaType.STRING, description: 'Nombre del producto tal como lo mencionó el cliente o aparece en la foto citada (ej. "VASO ELMAS", "Termo Space")' },
      color_foto: { type: SchemaType.STRING, description: 'Opcional. Color del que el cliente quiere ver la foto (ej. "marmoleado", "rosa", "azul marino"). Si lo pasas, se envía la foto de ese color.' },
    },
    required: ['producto'],
  }
};
export const TOOLS = [notificar_solicitud_cotizacion, transferir_a_humano, avisar_duda_al_equipo, buscar_productos_en_catalogo, consultar_colores_producto];
