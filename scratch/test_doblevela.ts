import 'dotenv/config';
import { getDobleVelaStock } from './src/server/services/doblevela.service.ts';

async function testDobleVela() {
  const modelo = process.argv[2] || 'A2131'; // Toma el modelo de la terminal, o usa A2131 por defecto
  console.log(`📡 Consultando stock en Doble Vela para el modelo: ${modelo}...`);
  
  try {
    const result = await getDobleVelaStock(modelo);
    if (result) {
      console.log('✅ ¡Conexión exitosa! Datos recibidos:');
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`⚠️ La API respondió, pero no se encontró información para el modelo "${modelo}".`);
    }
  } catch (error) {
    console.error('❌ Error crítico al conectar con Doble Vela:', error);
  }
}

testDobleVela();
