/**
 * Plantillas de WhatsApp para clientes, aprobadas en Meta (cuenta Laser Inova).
 * El texto debe coincidir con el registrado en Meta: se usa para la vista previa y para
 * guardar en el chat lo que se le mandó al cliente. Archivo seguro para el cliente.
 * Las plantillas de utilidad dentro de la ventana de 24 h no tienen costo, por eso los avisos
 * siempre van como plantilla aunque la ventana esté abierta.
 */

export type QuoteNoticeKind = 'production' | 'ready' | 'deposit' | 'paid';

export const CLIENT_TEMPLATES = {
  reengage: {
    name: 'retomar_conversacion',
    text: 'Hola, te escribimos de Laser Inova para dar seguimiento a {{1}}. Responde a este mensaje para continuar con la atención.',
  },
  deposit: {
    name: 'solicitud_anticipo',
    text: 'Hola, para iniciar tu pedido {{1}} necesitamos un anticipo de {{2}}. Datos de pago: {{3}}. Cuando realices el pago, envíanos tu comprobante por este medio.',
  },
  paid: {
    name: 'pago_recibido',
    text: 'Recibimos tu pago de {{1}} para el pedido {{2}}. Saldo pendiente: {{3}}. Gracias por tu preferencia.',
  },
  production: {
    name: 'pedido_en_produccion',
    text: 'Tu pedido {{1}} ya está en producción. Tiempo estimado de entrega: {{2}}. Te avisaremos por este medio cuando esté listo.',
  },
  ready: {
    name: 'pedido_listo',
    text: 'Tu pedido {{1}} ya está listo. {{2}}. Si tienes alguna duda, respóndenos por este medio.',
  },
} as const;

export type ClientTemplateKey = keyof typeof CLIENT_TEMPLATES;

export const NOTICE_LABELS: Record<QuoteNoticeKind, string> = {
  production: 'Pedido en producción',
  ready: 'Pedido listo',
  deposit: 'Solicitud de anticipo',
  paid: 'Pago recibido',
};

/** Campo editable que pide cada aviso antes de mandarse (además de lo que sale de la cotización). */
export const NOTICE_FIELDS: Record<QuoteNoticeKind, { key: 'deliveryTime' | 'instructions' | 'paymentInfo' | 'amount'; label: string; placeholder: string }[]> = {
  production: [{ key: 'deliveryTime', label: 'Tiempo estimado de entrega', placeholder: '5 días hábiles' }],
  ready: [{ key: 'instructions', label: 'Cómo recoger o recibir el pedido', placeholder: 'Puedes recogerlo en nuestro taller de lunes a viernes de 9:00 a 18:00' }],
  deposit: [
    { key: 'amount', label: 'Monto del anticipo', placeholder: '1740' },
    { key: 'paymentInfo', label: 'Datos de pago', placeholder: 'transferencia a la cuenta BBVA CLABE …' },
  ],
  paid: [{ key: 'amount', label: 'Monto recibido', placeholder: '1740' }],
};

export type NoticeExtra = Partial<Record<'deliveryTime' | 'instructions' | 'paymentInfo' | 'amount', string>>;

export function renderTemplate(key: ClientTemplateKey, params: string[]) {
  return CLIENT_TEMPLATES[key].text.replace(/\{\{(\d+)\}\}/g, (_, n) => params[Number(n) - 1] ?? `{{${n}}}`);
}

export const money = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;

/** Las variables de plantilla no admiten saltos de línea, tabulaciones ni más de 4 espacios seguidos. */
export function cleanParam(s: string) {
  return s.replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim().replace(/[.\s]+$/, '');
}

const toNumber = (s?: string) => {
  const n = Number(String(s ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
};

export type NoticeQuote = { folio: string; deliveryTime: string | null; balance: number };

/** Variables de cada aviso, en el orden de la plantilla. Vacías si falta un dato. */
export function noticeParams(kind: QuoteNoticeKind, quote: NoticeQuote, extra: NoticeExtra): string[] {
  switch (kind) {
    case 'production':
      return [quote.folio, extra.deliveryTime ?? quote.deliveryTime ?? ''];
    case 'ready':
      return [quote.folio, extra.instructions ?? ''];
    case 'deposit': {
      const amount = toNumber(extra.amount);
      return [quote.folio, amount ? money(amount) : '', extra.paymentInfo ?? ''];
    }
    case 'paid': {
      const amount = toNumber(extra.amount);
      return [amount ? money(amount) : '', quote.folio, quote.balance < 0.01 ? '$0.00 MXN (liquidado)' : money(quote.balance)];
    }
  }
}

export function previewNotice(kind: QuoteNoticeKind, quote: NoticeQuote, extra: NoticeExtra) {
  return renderTemplate(kind, noticeParams(kind, quote, extra).map(p => cleanParam(p) || '…'));
}
