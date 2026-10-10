import 'dotenv/config';
import { getDobleVelaStock } from './src/server/services/doblevela.service.ts';

// Parche temporal para imprimir el texto crudo y ver qué escupe Doble Vela
export async function getRawDobleVelaStock(modelo: string) {
  const url = 'http://srv-datos.dyndns.info/doblevela/service.asmx/GetExistencia';
  const params = new URLSearchParams();
  params.append('codigo', modelo);
  params.append('Key', process.env.DOBLE_VELA_KEY || '');

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });
  
  const text = await res.text();
  console.log('--- RESPUESTA CRUDA DE DOBLE VELA ---');
  console.log(text);
  console.log('-------------------------------------');
}

async function testDobleVela() {
  const modelo = process.argv[2] || 'A2131'; 
  console.log(`📡 Consultando stock en Doble Vela para el modelo: ${modelo}...`);
  await getRawDobleVelaStock(modelo);
}

testDobleVela();
