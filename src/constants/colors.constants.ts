/**
 * Diccionario de colores y conversor de nombres a valores Hexadecimales / gradientes
 */
export const COLOR_DICTIONARY: Record<string, string> = {
  "AZUL": "#1E3A8A",
  "AZUL CLARO": "#60A5FA",
  "AZUL MARINO": "#1e293b",
  "ROJO": "#DC2626",
  "NEGRO": "#171717",
  "BLANCO": "#FFFFFF",
  "PLATA": "#D4D4D8",
  "GRIS": "#71717A",
  "NARANJA": "#EA580C",
  "VERDE": "#16A34A",
  "VERDE CLARO": "#86EFAC",
  "AMARILLO": "#FACC15",
  "ROSA": "#F472B6",
  "MORADO": "#9333EA",
  "CAFE": "#78350F",
  "BEIGE": "#F5F5DC",
  "ACERO": "#9ca3af",
  "DORADO": "#CA8A04",
  "MULTICOLOR": "linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet)"
};

export function getHexForColor(colorName: string | null | undefined): string {
  if (!colorName) return "#ccc";
  const cleanColor = colorName.replace(/^\d+\s*-\s*/, '').trim().toUpperCase();
  return COLOR_DICTIONARY[cleanColor] || "#ccc";
}
