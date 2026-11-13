import Link from "next/link";
import type { ReactNode } from "react";

type Tone = "ink" | "whatsapp";
type Props = { href: string; tone?: Tone; className?: string; children: ReactNode };

const TONES: Record<Tone, string> = {
  ink: "text-gray-900 hover:text-gray-600",
  whatsapp: "text-violet-700 hover:text-violet-500",
};

/** Enlace de acción ("Ver todas →"). Neutro por defecto; en violeta cuando es del mundo WhatsApp. */
export default function ActionLink({ href, tone = "ink", className = "", children }: Props) {
  return (
    <Link href={href} prefetch={false} className={`text-xs font-bold underline-offset-4 hover:underline transition-colors ${TONES[tone]} ${className}`}>
      {children}
    </Link>
  );
}
