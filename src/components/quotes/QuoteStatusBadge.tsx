import { Badge, type BadgeSize } from "@/components/ui/Badge";
import { paymentStatusStyle, quoteStatusStyle } from "@/constants/quote-status";

/** En listas se usa el color suave; en encabezados y tablas, el chip con borde. */
const toneFor = (size: BadgeSize, style: { badge: string; chip: string }) => (size === "sm" ? style.badge : style.chip);

/** Estado de una cotización (Borrador, Enviada, Aprobada…) con su color. */
export function QuoteStatusBadge({ status, size = "sm" }: { status: string | null | undefined; size?: BadgeSize }) {
  const style = quoteStatusStyle(status);
  return <Badge size={size} tone={toneFor(size, style)}>{style.label}</Badge>;
}

/** Estado del cobro (Por cobrar, Anticipo, Pagado…) con su color. */
export function PaymentStatusBadge({ status, size = "sm" }: { status: string | null | undefined; size?: BadgeSize }) {
  const style = paymentStatusStyle(status);
  return <Badge size={size} tone={toneFor(size, style)}>{style.label}</Badge>;
}
