# 🧠 Arquitectura del Sistema de Inteligencia Artificial (Laser Inova CRM)

Este documento describe la estructura actual, flujo de datos y responsabilidades de los agentes de IA dentro del ecosistema de Laser Inova.

## 1. La Secretaria (Front-End Agent / WhatsApp)
Es la cara de la empresa frente al cliente. Está diseñada para ser empática, rápida y estrictamente apegada a las reglas del negocio.

*   **Modelo Principal:** Gemini 3.5 Flash.
*   **Capacidad Multimodal:** Capaz de recibir imágenes de referencia o notas de voz (Audio/OGG), transformándolas a Base64 y enviándolas al modelo para análisis visual/auditivo.
*   **El Cerebro (RAG Multi-Namespace):** 
    *   No depende de un "System Prompt" gigante. En su lugar, usa un RAG (Retrieval-Augmented Generation) respaldado por **Pinecone**.
    *   Cuenta con 4 "cajones" paralelos (Namespaces): `sales_policies`, `material_rules`, `product_protocols`, y `general_rules`.
    *   *Mecanismo de Consulta:* Cuando un cliente habla, el mensaje se convierte a vector usando `gemini-embedding-2`. Se disparan 4 consultas en paralelo (`Promise.all`) a Pinecone, rescatando las 4 reglas más relevantes con un *score* de similitud > 0.6.
*   **Gestión de Reglas (La Libreta Visual):** 
    *   Las reglas de la Secretaria viven en la base de datos MySQL (Tabla `AgentRule`). 
    *   Desde el CRM (`/dashboard/agent/knowledge`), el humano puede crear, editar o desactivar reglas. 
    *   *Auto-Sincronización:* Cualquier cambio en el CRM se re-vectoriza e inyecta o elimina de Pinecone instantáneamente en el *Server Action*.
*   **Delegación (Function Calling):** 
    *   Tiene el poder de invocar herramientas como `transferir_a_humano` (apaga el botMode) o `notificar_solicitud_cotizacion` (recopila 8 datos clave y despierta al Chalán).

## 2. El Chalán (Back-End Agent / Analista de Producción)
Es el experto técnico y matemático. No habla con el cliente, solo habla contigo (el administrador).

*   **Responsabilidad:** Tomar los datos crudos extraídos por la Secretaria (material, tamaño, cantidad, diseño) y calcular el costo de producción real.
*   **Lógica Matemática:** 
    *   Calcula áreas de corte/grabado.
    *   Cruza la información con el costo de la máquina por minuto.
    *   Genera un reporte técnico y financiero detallado de la utilidad y el costo del trabajo.
*   **Alertas al Dashboard:** Emite notificaciones en tiempo real (vía Event Emitter / SSE) para que el Jefe vea la cotización sugerida saltar en la pantalla sin recargar la página.

## 3. Catálogos y Entorno (Doble Vela) - *En Desarrollo*
*   **Arquitectura de Datos:** En lugar de saturar a la IA leyendo APIs lentas, se clona el catálogo masivo del proveedor (Doble Vela) hacia la base de datos MySQL local.
*   **Sincronización:** Mediante un Cron Job nocturno, se asegura que el stock y los precios estén al día.
*   **Impacto RAG:** Al tener la base de datos de productos en MySQL, El Chalán puede buscar y añadir el costo de productos armados (termos, plumas) al costo de manufactura en fracciones de segundo.

## ⚙️ Stack Tecnológico de IA
*   **LLM Core:** `@google/generative-ai` (Gemini 3.5 Flash).
*   **Vector Engine:** `@pinecone-database/pinecone` (Model: `gemini-embedding-2`).
*   **Base de Datos Principal:** MySQL (Prisma ORM) desplegado en Hostinger.
*   **Framework:** Next.js (Server Actions para inyección de vectores).
