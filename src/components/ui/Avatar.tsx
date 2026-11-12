import { User as UserIcon } from "lucide-react";
import { avatarGradient, initialsOf } from "@/lib/avatar";
import { cn } from "@/lib/cn";

export type AvatarProps = {
  /** Nombre para las iniciales, el color y el tooltip. */
  name: string | null | undefined;
  /** Texto alterno para el color si no hay nombre (p. ej. el teléfono). */
  seed?: string | null;
  /** Foto: si existe se muestra en lugar de las iniciales. */
  imageUrl?: string | null;
  /** Lado en píxeles. */
  size: number;
  shape?: "circle" | "rounded";
  /** Cuántas letras de iniciales (1 o 2). */
  maxInitials?: number;
  /** Colores fijos de los dueños (solo para usuarios del CRM). */
  team?: boolean;
  /** Estilo de las iniciales: "bold" (equipo, por defecto) o "soft" (contactos de WhatsApp, sin sombra). */
  variant?: "bold" | "soft";
  className?: string;
  /** Tooltip; por defecto el nombre. Pasa "" para quitarlo. */
  title?: string;
};

/** Átomo de avatar: foto o iniciales sobre un degradado estable por nombre. */
export function Avatar({ name, seed, imageUrl, size, shape = "circle", maxInitials = 2, team = false, variant = "bold", className, title }: AvatarProps) {
  const radius = shape === "circle" ? "9999px" : `${Math.round(size * 0.3)}px`;
  const style = { width: size, height: size, borderRadius: radius };
  const tooltip = title ?? name ?? undefined;

  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- fotos de perfil de otros dominios (WhatsApp)
    return <img src={imageUrl} alt={name || "Avatar"} title={tooltip} style={style} className={cn("object-cover shrink-0", className)} />;
  }

  const initials = initialsOf(name, maxInitials);
  return (
    <div
      title={tooltip}
      style={style}
      className={cn(
        "flex items-center justify-center shrink-0 text-white bg-gradient-to-br",
        variant === "bold" ? "font-black shadow-sm" : "font-semibold",
        avatarGradient(name || seed || "", { team }),
        className
      )}
    >
      {initials
        ? <span style={{ fontSize: Math.max(8, Math.round(size * (initials.length > 1 ? 0.34 : 0.42))) }}>{initials}</span>
        : <UserIcon size={size * 0.5} className="text-white/90" />}
    </div>
  );
}
