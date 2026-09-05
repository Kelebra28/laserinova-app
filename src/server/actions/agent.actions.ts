"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { 
  GoogleGenerativeAI, 
  FunctionDeclaration, 
  SchemaType, 
  Tool 
} from "@google/generative-ai";
import { createClientService, createQuoteService, calculateCutPriceService } from "../services/agent.service";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const crearClienteDeclaration: FunctionDeclaration = {
  name: "crear_cliente",
  description: "Crea un nuevo cliente en la base de datos del CRM.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      nombre: { type: SchemaType.STRING, description: "El nombre completo del cliente." },
      telefono: { type: SchemaType.STRING, description: "El teléfono de contacto del cliente." },
    },
    required: ["nombre"],
  },
};

const crearCotizacionDeclaration: FunctionDeclaration = {
  name: "crear_cotizacion",
  description: "Crea una cotización profesional asociada a un cliente, con uno o más conceptos (opciones de material). Úsalo cuando el usuario te pida crear una cotización, ya sea de un solo material o de varios.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      nombre_cliente: { type: SchemaType.STRING, description: "El nombre exacto del cliente al que se le asignará la cotización." },
      conceptos: {
        type: SchemaType.ARRAY,
        description: "Lista de opciones o materiales a cotizar.",
        items: {
          type: SchemaType.OBJECT,
          properties: {
            material_nombre: { type: SchemaType.STRING, description: "Nombre del material (ej: acrílico blanco, opalino)" },
            grosor_mm: { type: SchemaType.NUMBER, description: "Grosor en mm" },
            ancho_cm: { type: SchemaType.NUMBER, description: "Ancho en cm" },
            alto_cm: { type: SchemaType.NUMBER, description: "Alto en cm" },
            minutos_corte: { type: SchemaType.NUMBER, description: "Minutos de láser estimados" }
          },
          required: ["material_nombre", "ancho_cm", "alto_cm"]
        }
      }
    },
    required: ["nombre_cliente", "conceptos"],
  },
};

const calcularCorteDeclaration: FunctionDeclaration = {
  name: "calcular_precio_corte",
  description: "Calcula el precio informativo de un corte láser multiplicando el área del material por el precio, sumando el tiempo de corte. Úsalo cuando el usuario solo pregunta 'cuánto es' o 'cuánto cuesta'.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      material_nombre: { type: SchemaType.STRING, description: "Nombre del material (ej: acrílico, mdf)" },
      grosor_mm: { type: SchemaType.NUMBER, description: "Grosor en milímetros (ej: 3, 6)" },
      ancho_cm: { type: SchemaType.NUMBER, description: "Ancho en centímetros (ej: 30)" },
      alto_cm: { type: SchemaType.NUMBER, description: "Alto en centímetros (ej: 10)" },
      minutos_corte: { type: SchemaType.NUMBER, description: "Minutos estimados de corte láser (ej: 5)" },
    },
    required: ["material_nombre", "ancho_cm", "alto_cm"],
  },
};

const agentTools: Tool[] = [{
  functionDeclarations: [crearClienteDeclaration, crearCotizacionDeclaration, calcularCorteDeclaration],
}];

export async function processAgentCommand(userInput: string) {
  try {
    // 1. Zero Trust: Validar Sesión
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return { success: false, message: "No autorizado." };
    }

    if (!process.env.GEMINI_API_KEY) {
      throw new Error("Falta la variable de entorno GEMINI_API_KEY");
    }

    const modelOptions = {
      systemInstruction: "Eres un asistente interno (backend) de inteligencia artificial integrado en el CRM de la empresa Laser Inova. Tu único usuario es el dueño o los vendedores del taller, NO los clientes finales. Tu trabajo NO es saludar ni conversar con clientes, sino obedecer las órdenes de los empleados del taller para agilizar su trabajo administrativo. Ellos te darán órdenes rápidas como 'cotízame esto', 'crea un cliente' o 'cuánto cuesta este corte'. Debes ejecutar la herramienta (Tool) correspondiente. Si usas calcular_precio_corte, toma el resultado matemático que te devuelva la función y redacta una respuesta clara y directa para el empleado, por ejemplo: 'El costo estimado de esa pieza de acrílico es de $150 pesos'.",
      tools: agentTools,
    };

    let model = genAI.getGenerativeModel({ model: "gemini-3.7-flash", ...modelOptions });
    let chat;

    try {
      chat = model.startChat();
      await chat.sendMessage(userInput);
    } catch (apiError: any) {
      if (apiError.status === 503) {
        console.warn("gemini-3.7-flash sobrecargado (503). Intentando fallback a gemini-3.5-flash...");
        model = genAI.getGenerativeModel({ model: "gemini-3.5-flash", ...modelOptions });
        chat = model.startChat();
        await chat.sendMessage(userInput);
      } else {
        throw apiError;
      }
    }

    const history = await chat.getHistory();
    const lastMessage = history[history.length - 1];
    const functionCalls = lastMessage.parts.filter(part => part.functionCall).map(part => part.functionCall);

    if (!functionCalls || functionCalls.length === 0) {
      return { 
        success: true, 
        message: lastMessage.parts.map(p => p.text).join(" ") || "No se detectaron acciones a ejecutar."
      };
    }

    const executionResults = [];

    // Iteramos por las funciones invocadas
    for (const call of functionCalls) {
      if (!call) continue;
      const { name, args } = call;

      if (name === "crear_cliente") {
        const { nombre, telefono } = args as { nombre: string; telefono?: string };
        const newClient = await createClientService(nombre, telefono);
        executionResults.push({ accion: "Cliente Creado", data: newClient });

      } else if (name === "crear_cotizacion") {
        const { nombre_cliente, conceptos } = args as any;
        const newQuote = await createQuoteService(nombre_cliente, userId, conceptos);
        executionResults.push({ accion: "Cotización Creada", data: newQuote });

      } else if (name === "calcular_precio_corte") {
        const { material_nombre, grosor_mm, ancho_cm, alto_cm, minutos_corte } = args as any;
        const infoCalculo = await calculateCutPriceService(material_nombre, ancho_cm, alto_cm, minutos_corte, grosor_mm);
        executionResults.push({ accion: "Cálculo Realizado", data: infoCalculo });

      } else {
        throw new Error(`Función desconocida invocada por el modelo: ${name}`);
      }
    }

    return {
      success: true,
      message: "¡Listo! Procesé tu instrucción. Revisa los detalles abajo:",
      details: executionResults
    };

  } catch (error: any) {
    console.error("Error en el agente:", error);
    return {
      success: false,
      message: error?.message || "Ocurrió un error inesperado al procesar la instrucción."
    };
  }
}
