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

    // Procesar todos los colores/variantes de ese modelo
    const almacenesCDMX = [7, 9, 15, 20, 24];
    
    const variantsStock = data.Resultado.map((item: any) => {
      let totalStock = 0;
      almacenesCDMX.forEach(num => {
        const key = `Disponible Almacen ${num}`;
        if (item[key]) {
          totalStock += parseInt(item[key], 10) || 0;
        }
      });

      return {
        clave: item.CLAVE,
        modelo: item.MODELO,
        color: item.COLOR,
        stockReal: totalStock,
        precioCosto: item.Price || 0,
        imageUrl: `https://doblevela.com/images/large/${item.MODELO}_lrg.jpg`
      };
    });

    return variantsStock;
  } catch (error) {
    console.error("Error fetching Doble Vela API:", error);
    return null;
  }
}
