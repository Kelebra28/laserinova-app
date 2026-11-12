/** Colores de los avatares con iniciales (degradados de Tailwind). */

/** Paleta única: la misma persona sale del mismo color en todo el CRM. */
export const AVATAR_GRADIENTS = [
  "from-emerald-500 to-teal-600",
  "from-sky-500 to-blue-600",
  "from-violet-500 to-purple-600",
  "from-amber-500 to-orange-600",
  "from-pink-500 to-rose-600",
  "from-cyan-500 to-teal-600",
  "from-lime-500 to-green-600",
];

/**
 * Colores fijos de los dueños (solo avatares del equipo, no de clientes).
 * Se busca la palabra dentro del nombre en minúsculas.
 */
export const TEAM_AVATAR_OVERRIDES: { match: string; gradient: string }[] = [
  { match: "ricardo", gradient: "from-red-500 to-rose-600 shadow-red-500/20" },
  { match: "raul", gradient: "from-blue-500 to-indigo-600 shadow-blue-500/20" },
];
