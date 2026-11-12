/** Une clases de Tailwind ignorando las vacías: cn("a", cond && "b", undefined) → "a b". */
export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}
