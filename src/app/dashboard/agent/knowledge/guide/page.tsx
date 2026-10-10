import Link from "next/link";
import { ArrowLeft, BrainCircuit } from "lucide-react";

export default function AIGuidePage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div className="flex items-center gap-4">
          <Link href="/dashboard/agent/knowledge" className="p-2 hover:bg-zinc-200 rounded-full transition-colors text-zinc-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center border border-indigo-200">
              <BrainCircuit className="w-5 h-5 text-indigo-700" />
            </div>
            <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Guía de Reglas de IA (Pinecone)</h1>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm max-w-none text-zinc-600">
          <h2 className="text-xl font-extrabold text-zinc-900 mb-4 mt-0">1. Conoce a tus Agentes</h2>
          <p className="mb-6">
            El CRM está dividido en dos inteligencias artificiales con personalidades y responsabilidades completamente separadas. Cuando escribas una regla, debes pensar <strong className="text-zinc-900">para quién</strong> va dirigida.
          </p>
          
          <h3 className="text-lg font-bold text-zinc-800 mb-3">👩‍💼 "La Secre" (Servicio al Cliente)</h3>
          <ul className="list-disc pl-5 mb-8 space-y-2">
            <li><strong className="text-zinc-800">Rol:</strong> Atiende los mensajes de WhatsApp de entrada. Es la cara de Laser Inova.</li>
            <li><strong className="text-zinc-800">Objetivo:</strong> Perfilar al cliente, extraer las especificaciones (Material, Medidas, Cantidad, Archivos) y conseguir el Nombre del cliente.</li>
            <li><strong className="text-zinc-800">Personalidad:</strong> Amable, directa, asertiva y con autoridad técnica. (Tiene estrictamente prohibido regatear y usar emojis).</li>
            <li><strong className="text-zinc-800">Qué reglas lee:</strong> Lee principalmente las reglas de <code className="bg-zinc-100 px-1 py-0.5 rounded text-zinc-800 text-sm">general_rules</code> (Comportamiento y objeciones) y busca productos en el catálogo de Doble Vela automáticamente.</li>
          </ul>

          <h3 className="text-lg font-bold text-zinc-800 mb-3">👷‍♂️ "El Chalán" (Estimador Técnico Interno)</h3>
          <ul className="list-disc pl-5 mb-8 space-y-2">
            <li><strong className="text-zinc-800">Rol:</strong> Trabaja en las sombras. No habla con el cliente.</li>
            <li><strong className="text-zinc-800">Objetivo:</strong> Recibir el resumen que le pasó "La Secre" y hacer los cálculos matemáticos para estimar cuánto material se usará, cuánto tiempo de láser tomará, y cuál será el costo interno de la máquina.</li>
            <li><strong className="text-zinc-800">Personalidad:</strong> Técnica, fría y matemática. Responde con reportes tabulares para que tú (el administrador) los revises.</li>
            <li><strong className="text-zinc-800">Qué reglas lee:</strong> Lee exclusivamente reglas técnicas, tiempos de corte, velocidades, mermas por tipo de material, y restricciones de maquinaria (<code className="bg-zinc-100 px-1 py-0.5 rounded text-zinc-800 text-sm">chalan_technical</code>).</li>
          </ul>

          <hr className="my-8 border-zinc-200" />

          <h2 className="text-xl font-extrabold text-zinc-900 mb-4">2. Cómo funciona Pinecone (RAG)</h2>
          <p className="mb-4">
            <strong className="text-zinc-900">RAG</strong> significa <em className="text-zinc-800">Retrieval-Augmented Generation</em>. En español: en lugar de darle a la IA un documento de 100 páginas para que lo lea en cada mensaje, <strong className="text-zinc-900">Pinecone</strong> funciona como un archivero mágico.
          </p>
          <p className="mb-4">Cuando un cliente escribe: <em className="text-zinc-800">"Oye, quiero cortar 100 termos, ¿qué precio tienen?"</em></p>
          <ol className="list-decimal pl-5 mb-8 space-y-2">
            <li>El sistema lee el mensaje.</li>
            <li>Va al archivero (Pinecone) y busca reglas que hablen de "termos", "precios" o "cortar".</li>
            <li>Saca <strong className="text-zinc-900">únicamente las 3 o 4 reglas más relevantes</strong>.</li>
            <li>Se las entrega a "La Secre" justo antes de que ella responda.</li>
          </ol>

          <hr className="my-8 border-zinc-200" />

          <h2 className="text-xl font-extrabold text-zinc-900 mb-4">3. Mejores Prácticas para Escribir Reglas</h2>
          <p className="mb-6">
            Para que la IA obedezca una regla sin fallar, debes redactarla como si le estuvieras dando instrucciones <strong className="text-zinc-900">estrictas y directas a un empleado nuevo</strong>.
          </p>
          
          <div className="bg-red-50 border-l-4 border-red-500 p-4 my-6 rounded-r-lg">
            <h4 className="text-red-800 font-bold mb-2">❌ Lo que NO debes hacer (Reglas débiles)</h4>
            <p className="m-0 text-red-900 text-sm">
              <em>"Si el cliente saluda, dile buenos días o tardes dependiendo la hora."</em> (Demasiado ambiguo).<br/><br/>
              <em>"Los termos cuestan 150 pesos."</em> (Peligroso: la IA se confundirá con los precios oficiales del sistema).
            </p>
          </div>

          <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 my-6 rounded-r-lg">
            <h4 className="text-emerald-800 font-bold mb-2">✅ Lo que SÍ debes hacer (Reglas fuertes)</h4>
            <p className="m-0 text-emerald-900 text-sm">
              Usa comandos directos, pon la instrucción en MAYÚSCULAS para resaltar urgencia, y delimita los textos exactos entre comillas.
            </p>
          </div>

          <h4 className="font-bold text-zinc-800 mb-2 mt-6">Ejemplo 1: Saludo Condicionado</h4>
          <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-xl text-sm whitespace-pre-wrap mb-8">
Categoría: general_rules
Título: Regla Estricta de Saludo Inicial
Texto: "Cuando saludes a un cliente por primera vez, adapta siempre el saludo dependiendo de la hora del día. Usa estrictamente esta estructura: 'Hola, [buenos días / buenas tardes / buenas noches]. Gracias por contactar a Laser Inova. Somos especialistas en corte y grabado láser, impresión UV y personalización de productos. Cuéntame, ¿en qué proyecto te podemos ayudar?' No agregues texto extra."
          </pre>

          <h4 className="font-bold text-zinc-800 mb-2 mt-6">Ejemplo 2: Rechazo de Trabajos Peligrosos</h4>
          <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-xl text-sm whitespace-pre-wrap mb-8">
Categoría: chalan_technical
Título: Prohibición de corte en PVC
Texto: "REGLA DE SEGURIDAD ESTRICTA: Está absolutamente prohibido cortar o grabar materiales que contengan PVC, vinil o cloruro, ya que emiten gases tóxicos que dañan el lente láser. Si el cliente pide trabajar PVC, rechaza el trabajo de forma amable pero tajante argumentando medidas de seguridad de la maquinaria."
          </pre>

          <hr className="my-8 border-zinc-200" />

          <h2 className="text-xl font-extrabold text-zinc-900 mb-4">4. Explicación de las Categorías (Namespaces)</h2>
          <ul className="list-disc pl-5 mb-4 space-y-4">
            <li>
              <strong className="text-zinc-800">general_rules (Comportamiento General):</strong> Úsala para Saludos, despedidas, tono de voz, manejo de clientes enojados, políticas de envío, métodos de pago, horarios de atención, y objeciones comunes.
            </li>
            <li>
              <strong className="text-zinc-800">chalan_technical (Reglas Técnicas del Taller):</strong> Úsala para Límites de tamaño de la cama del láser, grosores máximos que aguanta la máquina, materiales tóxicos, y consideraciones sobre vectores.
            </li>
            <li>
              <strong className="text-zinc-800">pricing (Estrategia de Precios / Opcional):</strong> Úsala para Políticas de descuentos por volumen de maquila. <em className="text-zinc-500">Ojo: Evita poner precios fijos aquí.</em>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
