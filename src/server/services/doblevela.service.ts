export async function getDobleVelaStock(modelo: string) {
  const url = 'http://srv-datos.dyndns.info/doblevela/service.asmx/GetExistencia';
  const params = new URLSearchParams();
  params.append('codigo', modelo);
  params.append('Key', process.env.DOBLE_VELA_KEY || '');

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    
    const text = await res.text();
    // Extraer el JSON que viene envuelto en XML
    const match = text.match(/<string[^>]*>(.*)<\/string>/);
    if (!match) return null;

    const data = JSON.parse(match[1]);
    if (!data.Resultado || data.Resultado.length === 0) return null;

    // Sumar solo almacenes CDMX según documentación
    let totalStock = 0;
    const item = data.Resultado[0];
    const almacenesCDMX = [7, 9, 15, 20, 24];
    
    almacenesCDMX.forEach(num => {
      // Nota: El JSON real de Doble Vela no trae acento en "Almacen"
      const key = `Disponible Almacen ${num}`;
      if (item[key]) {
        totalStock += parseInt(item[key], 10) || 0;
      }
    });

    return {
      modelo: item.MODELO,
      descripcion: item.NOMBRE,
      stockReal: totalStock,
      precioCosto: item.Price || 0,
      imageUrl: `https://doblevela.com/images/large/${item.MODELO}_lrg.jpg`
    };
  } catch (error) {
    console.error("Error fetching Doble Vela API:", error);
    return null;
  }
}
