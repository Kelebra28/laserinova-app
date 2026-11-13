// Simulador del bot de clientes: SOLO LEE (no BD, no WhatsApp). Prompt real + reglas reales + herramientas reales (simuladas).
// Uso:
//   npx tsx scratch/simulate_bot.ts "msg1" "msg2"        -> cada mensaje como conversación nueva
//   npx tsx scratch/simulate_bot.ts --chat "msg1" "msg2" -> los mensajes son una sola conversación (turnos del cliente)
import * as dotenv from 'dotenv';
import { GoogleGenerativeAI, Content } from '@google/generative-ai';
import { getSecretarySystemPrompt } from '../src/lib/agents/secretary/prompt';
import { getRelevantRules } from '../src/lib/agents/secretary/knowledge-base';
import { TOOLS } from './bot_tools';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

// Respuestas falsas de herramientas (el sistema real consulta BD/catálogo).
function fakeToolResult(name: string, args: any) {
  if (name === 'buscar_productos_en_catalogo') return { productos: [{ nombre: 'Termo Space 550ml', precio: 189 }, { nombre: 'Termo Aurora 500ml', precio: 165 }], nota: 'Fotos enviadas al cliente por WhatsApp' };
  if (name === 'consultar_colores_producto') return { colores: ['negro', 'blanco', 'rosa', 'azul marino'], stock: 'disponible' };
  return { ok: true };
}

async function turn(history: Content[], msg: string, hasQuote: boolean) {
  const rawMsg = msg;
  const rag = await getRelevantRules(msg, genAI);
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.5-flash',
    systemInstruction: getSecretarySystemPrompt('', rag.context, hasQuote),
    tools: [{ functionDeclarations: TOOLS }],
  });
  const parts: any[] = [];
  if (msg.startsWith('@img ')) {
    msg = msg.slice(5);
    const fs = await import('fs');
    parts.push({ text: msg || '[El cliente envió una imagen]' }, { inlineData: { data: fs.readFileSync(process.env.SIM_IMG as string).toString('base64'), mimeType: 'image/webp' } });
  } else if (msg.startsWith('@ph ')) {
    msg = msg.slice(4);
    parts.push({ text: `[El cliente envió una imagen]\n${msg}` });
  } else parts.push({ text: msg });
  history.push({ role: 'user', parts });
  console.log('\nCLIENTE:', msg);
  console.log('  reglas:', rag.sources.length ? rag.sources.map((s) => s.slice(0, 70)).join(' | ') : '(ninguna)');

  let quoteCalled = false;
  for (let step = 0; step < 3; step++) {
    const res = await model.generateContent({ contents: history });
    const r = res.response;
    const cand = r.candidates?.[0];
    const calls = r.functionCalls() ?? [];
    let text = '';
    try { text = r.text(); } catch (e: any) { text = ''; console.log('  !! text() lanzó:', e.message); }
    if (calls.length) {
      for (const c of calls) console.log(`  [herramienta] ${c.name}(${JSON.stringify(c.args)})`);
      if (calls.some((c) => c.name === 'notificar_solicitud_cotizacion')) quoteCalled = true;
    }
    if (!text.trim() && !calls.length) console.log(`  !! VACÍO. finishReason=${cand?.finishReason} bloqueo=${JSON.stringify(r.promptFeedback)}`);
    if (calls.length) {
      history.push(cand!.content);
      history.push({ role: 'user', parts: calls.map((c) => ({ functionResponse: { name: c.name, response: fakeToolResult(c.name, c.args) } })) });
      if (text.trim()) console.log('BOT (texto junto a la herramienta):', text.trim());
      continue;
    }
    console.log('BOT:', text.trim() || '(sin texto)');
    history.push({ role: 'model', parts: [{ text }] });
    return quoteCalled;
  }
  return quoteCalled;
}

async function main() {
  const args = process.argv.slice(2);
  const chat = args[0] === '--chat';
  const msgs = chat ? args.slice(1) : args;
  let history: Content[] = [];
  let hasQuote = false;
  for (const m of msgs) {
    if (!chat) { history = []; hasQuote = false; console.log('\n' + '='.repeat(70)); }
    if (await turn(history, m, hasQuote)) hasQuote = true;
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
