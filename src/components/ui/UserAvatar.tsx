import { Avatar } from "@/components/ui/Avatar";

const SIZES = {
  xs: 20,
  sm: 28,
  base: 32,
  md: 36,
  lg: 44,
} as const;

interface UserAvatarProps {
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}

/**
 * Avatar de un usuario del CRM: dos letras del primer nombre (RI de Ricardo, RA de Raul),
 * esquinas redondeadas y los colores fijos de los dueños.
 */
export function UserAvatar({ name, size = "md", className = "" }: UserAvatarProps) {
  return <Avatar name={name} size={SIZES[size]} shape="rounded" maxInitials={2} team className={className} />;
}
