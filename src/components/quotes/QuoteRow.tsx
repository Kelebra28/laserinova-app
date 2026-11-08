"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Trash2 } from "lucide-react";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { STATUS_STYLES, PAYMENT_STYLES, ageLabel } from "@/components/quotes/statusStyles";

interface QuoteRowProps {
  quote: any;
  onDeleteRequest: (quote: any) => void;
}

const money = (n: number) =>
  `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function QuoteRow({ quote, onDeleteRequest }: QuoteRowProps) {
  const router = useRouter();
  const href = `/dashboard/quotes/${quote.id}`;
  const status = STATUS_STYLES[quote.status] ?? { label: quote.status, badge: "bg-gray-100 text-gray-700" };
  const payment = PAYMENT_STYLES[quote.paymentStatus || "PENDING"] ?? PAYMENT_STYLES.PENDING;
  const balance = Math.max(quote.total - (quote.realAmountCollected || 0), 0);
  const showBalance =
    quote.paymentStatus !== "PAID" &&
    !["DRAFT", "CALCULATED", "CANCELLED", "REJECTED"].includes(quote.status) &&
    balance > 0;
  const clientName = quote.client?.company || quote.client?.name || quote.prospectName || "Sin cliente";

  return (
    <tr
      onClick={(e) => {
        // Clic en cualquier parte de la fila navega, salvo en enlaces y botones
        if ((e.target as HTMLElement).closest("a,button")) return;
        router.push(href);
      }}
      className="hover:bg-gray-50 transition-colors cursor-pointer group"
    >
      <td className="px-4 py-3 whitespace-nowrap text-sm font-bold">
        {/* Enlace real: permite Ctrl+clic, clic medio y navegación con teclado */}
        <Link href={href} prefetch={false} className="text-red-600 hover:underline focus-visible:underline outline-none">
          {quote.folio}
        </Link>
      </td>

      <td className="px-4 py-3 max-w-[16rem]">
        <p className="text-sm font-semibold text-gray-900 truncate">{clientName}</p>
        {quote.client?.company && quote.client?.name && (
          <p className="text-xs text-gray-500 truncate">{quote.client.name}</p>
        )}
      </td>

      <td className="px-4 py-3 max-w-[16rem] text-sm text-gray-700">
        <p className="truncate">{quote.project}</p>
      </td>

      <td className="px-4 py-3 whitespace-nowrap text-right">
        <p className="text-sm font-bold text-gray-900 tabular-nums">{money(quote.total)}</p>
        {showBalance && <p className="text-xs text-amber-600 tabular-nums">Debe {money(balance)}</p>}
      </td>

      <td className="px-4 py-3 whitespace-nowrap">
        <span className={`px-2.5 py-1 inline-flex text-xs font-semibold rounded-full ${status.badge}`}>{status.label}</span>
      </td>

      <td className="px-4 py-3 whitespace-nowrap">
        <span className={`px-2.5 py-1 inline-flex text-xs font-semibold rounded-full ${payment.badge}`}>{payment.label}</span>
      </td>

      <td className="px-4 py-3 whitespace-nowrap">
        <p className="text-sm text-gray-700">{new Date(quote.createdAt).toLocaleDateString("es-MX")}</p>
        <p className="text-xs text-gray-400">{ageLabel(quote.createdAt)}</p>
      </td>

      <td className="px-4 py-3 whitespace-nowrap">
        {quote.user ? (
          <div className="flex items-center gap-2">
            <UserAvatar name={quote.user.name} size="xs" />
            <span className="text-xs font-medium text-gray-600 hidden 2xl:block">{quote.user.name.split(" ")[0]}</span>
          </div>
        ) : (
          <span className="text-xs text-gray-300">—</span>
        )}
      </td>

      <td className="px-4 py-3 whitespace-nowrap text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            data-testid={`delete-quote-${quote.folio}`}
            onClick={() => onDeleteRequest(quote)}
            title="Eliminar cotización"
            aria-label={`Eliminar cotización ${quote.folio}`}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-red-600 transition-colors" />
        </div>
      </td>
    </tr>
  );
}
