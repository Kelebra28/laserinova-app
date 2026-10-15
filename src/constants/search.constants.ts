/**
 * Diccionario de sinónimos y términos relacionados para artículos promocionales y merchandising.
 * Se utiliza en los motores de búsqueda del catálogo y cotizador.
 */
export const PROMOTIONAL_SYNONYMS: Record<string, string[]> = {
  // Drinkware / Vasos / Bebidas
  vaso: ["vaso", "vasos", "termo", "termos", "tumbler", "tarro", "mug", "taza", "tequilero", "shot"],
  vasos: ["vaso", "vasos", "termo", "termos", "tumbler", "tarro", "mug", "taza", "tequilero", "shot"],
  termo: ["termo", "termos", "vaso", "vasos", "tumbler", "mug", "botella", "cilindro", "anfora"],
  termos: ["termo", "termos", "vaso", "vasos", "tumbler", "mug", "botella", "cilindro", "anfora"],
  taza: ["taza", "tazas", "tarro", "tarros", "mug", "vaso"],
  tazas: ["taza", "tazas", "tarro", "tarros", "mug", "vaso"],
  tarro: ["tarro", "tarros", "taza", "tazas", "vaso", "cervecero"],
  tarros: ["tarro", "tarros", "taza", "tazas", "vaso", "cervecero"],
  cilindro: ["cilindro", "cilindros", "botella", "botellas", "anfora", "termo", "vaso"],
  cilindros: ["cilindro", "cilindros", "botella", "botellas", "anfora", "termo", "vaso"],
  botella: ["botella", "botellas", "cilindro", "cilindros", "anfora", "termo"],
  botellas: ["botella", "botellas", "cilindro", "cilindros", "anfora", "termo"],
  tequilero: ["tequilero", "tequileros", "shot", "vaso", "vasos"],

  // Escritura / Oficina
  pluma: ["pluma", "plumas", "boligrafo", "boligrafos", "lapicero", "roller", "plumin"],
  plumas: ["pluma", "plumas", "boligrafo", "boligrafos", "lapicero", "roller", "plumin"],
  boligrafo: ["boligrafo", "boligrafos", "pluma", "plumas", "lapicero"],
  boligrafos: ["boligrafo", "boligrafos", "pluma", "plumas", "lapicero"],
  libreta: ["libreta", "libretas", "cuaderno", "cuadernos", "agenda", "agendas", "notebook", "memos"],
  libretas: ["libreta", "libretas", "cuaderno", "cuadernos", "agenda", "agendas", "notebook", "memos"],
  cuaderno: ["cuaderno", "cuadernos", "libreta", "libretas", "agenda"],
  cuadernos: ["cuaderno", "cuadernos", "libreta", "libretas", "agenda"],

  // Textil y Accesorios
  playera: ["playera", "playeras", "camiseta", "camisetas", "t-shirt", "polo", "textil"],
  playeras: ["playera", "playeras", "camiseta", "camisetas", "t-shirt", "polo", "textil"],
  gorra: ["gorra", "gorras", "visera", "viseras", "sombrero", "cachucha"],
  gorras: ["gorra", "gorras", "visera", "viseras", "sombrero", "cachucha"],
  mochila: ["mochila", "mochilas", "backpack", "maletin", "morral", "bolsa", "hielera"],
  mochilas: ["mochila", "mochilas", "backpack", "maletin", "morral", "bolsa", "hielera"],
  bolsa: ["bolsa", "bolsas", "tote", "ecologica", "morral"],
  bolsas: ["bolsa", "bolsas", "tote", "ecologica", "morral"],

  // Tecnología
  usb: ["usb", "memoria", "memorias", "pendrive", "flash"],
  memoria: ["usb", "memoria", "memorias", "pendrive", "flash"],
  memorias: ["usb", "memoria", "memorias", "pendrive", "flash"],
  bocina: ["bocina", "bocinas", "audifonos", "altavoz", "speaker"],
  bocinas: ["bocina", "bocinas", "audifonos", "altavoz", "speaker"],
  audifonos: ["audifonos", "auriculares", "headset", "earbuds", "bocina"],

  // Llaveros y otros
  llavero: ["llavero", "llaveros", "keychain"],
  llavero_destapador: ["llavero", "destapador", "abridor"],
  paraguas: ["paraguas", "sombrilla", "sombrillas"],
  sombrilla: ["paraguas", "sombrilla", "sombrillas"]
};
