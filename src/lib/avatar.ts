import { AVATAR_GRADIENTS, TEAM_AVATAR_OVERRIDES } from "@/constants/avatar";

/** Degradado estable para un nombre (mismo nombre → mismo color). Con `team`, aplica los colores fijos de los dueños. */
export function avatarGradient(seed: string, { team = false }: { team?: boolean } = {}): string {
  if (team) {
    const lower = seed.toLowerCase();
    const fixed = TEAM_AVATAR_OVERRIDES.find((o) => lower.includes(o.match));
    if (fixed) return fixed.gradient;
  }
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

/**
 * Iniciales del primer nombre, solo letras y números (ignora emojis): "Ricardo Basurto" → "RI" (max 2), "R" (max 1).
 * Vacío si el nombre no tiene ninguna letra (p. ej. "👑").
 */
export function initialsOf(name: string | null | undefined, max = 2): string {
  const chars = Array.from((name ?? "").trim()).filter((ch) => /[\p{L}\p{N}]/u.test(ch));
  const firstWord = (name ?? "").trim().split(/\s+/)[0] ?? "";
  const fromFirstWord = Array.from(firstWord).filter((ch) => /[\p{L}\p{N}]/u.test(ch));
  return (fromFirstWord.length ? fromFirstWord : chars).slice(0, max).join("").toUpperCase();
}
