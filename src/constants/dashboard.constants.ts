/**
 * Constantes del dashboard: periodos, etiquetas, umbrales de negocio, reglas de detección,
 * estilos del mapa de calor y colores de gráficas. Nada de esto debe vivir dentro de un componente.
 */
import type { DashboardRange } from "@/types/dashboard";

/* ───────────── Periodos ───────────── */

export const DASHBOARD_RANGES: { id: DashboardRange; label: string }[] = [
  { id: "today", label: "Hoy" },
  { id: "7d", label: "7 días" },
  { id: "30d", label: "30 días" },
  { id: "month", label: "Este mes" },
];

export const DASHBOARD_RANGE_LABELS: Record<DashboardRange, string> = {
  today: "Hoy",
  "7d": "Últimos 7 días",
  "30d": "Últimos 30 días",
  month: "Este mes",
};

export const DASHBOARD_DEFAULT_RANGE: DashboardRange = "30d";
export const DASHBOARD_REFRESH_MS = 60_000;

/** Texto de comparación según el periodo elegido. */
export const COMPARISON_LABEL: Record<DashboardRange, string> = {
  today: "vs ayer",
  "7d": "vs periodo anterior",
  "30d": "vs periodo anterior",
  month: "vs mes anterior",
};

/* ───────────── Reglas de negocio (servidor) ───────────── */

export const DASHBOARD_TZ = "America/Mexico_City";
// México no tiene horario de verano desde 2022: el offset es fijo.
export const DASHBOARD_TZ_OFFSET = "-06:00";
export const DAY_MS = 24 * 60 * 60 * 1000;

export const INCOME_TYPES = ["INGRESO", "ANTICIPO", "LIQUIDACION"];
export const EXPENSE_TYPES = ["GASTO_OPERATIVO", "GASTO_PROYECTO"];
export const WON_STATUSES = ["APPROVED", "ACCEPTED", "IN_PRODUCTION", "DELIVERED", "DONE"];
export const LOST_STATUSES = ["REJECTED", "CANCELLED"];
export const SENT_STATUSES = ["SENT", ...WON_STATUSES, ...LOST_STATUSES];
/** Cotizaciones vivas ligadas a un chat: dicen de qué lado está la pelota. */
export const OPEN_QUOTE_STATUSES = ["DRAFT", "CALCULATED", "SENT"];

// Contactos del simulador del bot: no son clientes reales.
export const SIMULATOR_PREFIX = "Cliente de Prueba";

// Un mensaje que lleva menos de esto esperando todavía no cuenta como pendiente.
export const UNANSWERED_GRACE_MIN = 2;
// Chats que llevan más que esto esperando son chats muertos, no pendientes.
export const PENDING_STALE_DAYS = 60;
export const SPARK_DAYS = 14;
export const HEATMAP_DAYS = 30;
export const SERIES_DAYS = 30;
export const SERIES_WEEKS = 12;
export const SERIES_MONTHS = 12;
export const OPEN_QUOTES_LOOKBACK_DAYS = 45;
export const QUOTE_IDLE_MAX_DAYS = 30;
export const PENDING_LIST_SIZE = 6;
export const PENDING_PREVIEW_CHARS = 70;

export const AGING_BUCKETS = [
  { label: "0-30 días", max: 30, color: "#f59e0b" },
  { label: "31-60 días", max: 60, color: "#ef4444" },
  { label: "Más de 60 días", max: Infinity, color: "#b91c1c" },
];

/** Frases con las que el cliente dice que él enviará o confirmará algo (la pelota está de su lado). */
export const CLIENT_PROMISE_REGEX =
  /\b(te\s+(lo\s+|la\s+|los\s+|las\s+)?(mando|env[ií]o|paso|comparto|hago\s+llegar|mandar[eé]|enviar[eé]|pasar[eé])|ahorita\s+te|en\s+un\s+momento\s+te|m[aá]s\s+tarde\s+te|ma[ñn]ana\s+te|te\s+aviso|te\s+confirmo|d[eé]jame\s+(lo\s+)?(busco|checo|reviso|consulto|pregunto)|lo\s+(checo|reviso|consulto)|ya\s+te\s+(digo|confirmo|aviso))/i;

/** Mensajes que cierran la conversación ("gracias", "ok", un pulgar): no piden respuesta. */
export const CONVERSATION_CLOSER_REGEX =
  /^(muchas\s+|mil\s+)?gracias[\s!.,a-záéíóúñ😊🙏👍]{0,25}$|^(ok|okay|okey|va|vale|sale|listo|perfecto|excelente|enterado|de\s+acuerdo|muy\s+bien|genial|entendido|claro)[\s!.,😊🙏👍]{0,10}$|^[\s👍🙏👌😊❤️✅🙌]+$/i;
export const CONVERSATION_CLOSER_MAX_CHARS = 40;

export const MESSAGE_TYPE_LABELS: Record<string, string> = {
  IMAGE: "📷 Imagen",
  AUDIO: "🎤 Audio",
  DOCUMENT: "📄 Documento",
  VIDEO: "🎬 Video",
};

/* ───────────── Pendientes de WhatsApp ───────────── */

export const PENDING_GROUP_ORDER = ["respond", "quote", "clientSend", "quoteSent"] as const;
export type PendingGroupKey = (typeof PENDING_GROUP_ORDER)[number];

export const PENDING_GROUPS: { key: PendingGroupKey; side: "mine" | "theirs"; label: string; hint: string; empty: string }[] = [
  { key: "respond", side: "mine", label: "Por responder", hint: "El cliente escribió y nadie le ha contestado.", empty: "Nadie esperando respuesta" },
  { key: "quote", side: "mine", label: "Falta cotización", hint: "Hay una cotización armada que todavía no se le manda al cliente.", empty: "No hay cotizaciones sin enviar" },
  { key: "clientSend", side: "theirs", label: "Cliente quedó en enviar", hint: "Su último mensaje dice que mandará o confirmará algo (se detecta por frases como “te mando” o “lo checo”).", empty: "Nadie quedó de enviar algo" },
  { key: "quoteSent", side: "theirs", label: "Cotización sin respuesta", hint: "Ya se le mandó la cotización y no ha contestado.", empty: "Todas las cotizaciones tienen respuesta" },
];

/* ───────────── Volumen de mensajes ───────────── */

export const VOLUME_GRANULARITIES = [
  { id: "day", label: "Día", hint: "Últimos 30 días", unit: "día" },
  { id: "week", label: "Semana", hint: "Últimas 12 semanas", unit: "semana" },
  { id: "month", label: "Mes", hint: "Últimos 12 meses", unit: "mes" },
] as const;
export type VolumeGranularity = (typeof VOLUME_GRANULARITIES)[number]["id"];

export const VOLUME_METRICS = [
  { id: "users", label: "Usuarios" },
  { id: "messages", label: "Mensajes" },
] as const;
export type VolumeMetric = (typeof VOLUME_METRICS)[number]["id"];

/* ───────────── Mapa de calor ───────────── */

export const HEATMAP_DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
export const HEATMAP_BLOCK_HOURS = 3;
export const HEATMAP_WORK_HOURS = { from: 9, to: 18 };
export const HEATMAP_LEVEL_STYLE = [
  "bg-gray-100 text-transparent",
  "bg-violet-100 text-violet-700",
  "bg-violet-300 text-violet-950",
  "bg-violet-500 text-white",
  "bg-violet-700 text-white",
];

/* ───────────── Atención ───────────── */

export const ATTENTION_META: Record<string, { chip: string; href: string; hint: string }> = {
  stale: { chip: "Sin respuesta", href: "/dashboard/quotes", hint: "Cotizaciones enviadas hace 7 a 60 días sin respuesta: aún se pueden rescatar. Las más recientes van primero." },
  unpaid: { chip: "Saldo pendiente", href: "/dashboard/quotes", hint: "Ya se entregó el trabajo y el cliente todavía debe." },
  overdue: { chip: "Tareas vencidas", href: "/dashboard/tasks", hint: "Tareas que pasaron su fecha límite. Las más recientes van primero." },
  blocked: { chip: "Bloqueadas", href: "/dashboard/tasks", hint: "Tareas detenidas por un motivo que alguien tiene que resolver." },
};
export const ATTENTION_TONE_DOT = { red: "bg-red-600", amber: "bg-amber-400", orange: "bg-red-400" } as const;
export const DASHBOARD_TASKS_SHOWN = 5;

/* ───────────── Paleta y gráficas ─────────────
 * Cada color tiene UN trabajo:
 *   negro / grises → base, texto, enlaces y cotizaciones (neutro)
 *   violeta        → todo lo de WhatsApp
 *   verde          → dinero que entra y "todo bien"
 *   ámbar → rojo   → alertas y urgencias (el rojo NO es decorativo)
 *   rojo de marca  → solo identidad (título, sidebar, botón principal)
 */

export const BRAND_RED = "#dc2626";
export const INK = "#111827";
export const WHATSAPP = "#7c3aed";
export const WHATSAPP_SOFT = "#ddd6fe";

export const CHART_COLORS = {
  income: "#10b981",
  expense: "#f87171",
  profitLine: INK,
  /** Dato principal de WhatsApp (lo que escriben los clientes). */
  inbound: WHATSAPP,
  /** Dato secundario (lo que enviamos), en gris para que no compita. */
  outbound: "#9ca3af",
  returning: WHATSAPP_SOFT,
  grid: "#f3f4f6",
  tick: "#9ca3af",
  cursor: "#f9fafb",
};

/** Embudo del chat al cobro: grises que se oscurecen y verde al cobrar. */
export const FUNNEL_COLORS = { chats: "#d1d5db", quoted: "#9ca3af", sent: "#6b7280", won: INK, paid: "#10b981" };

/** Cotizaciones abiertas por etapa. */
export const PIPELINE_COLORS: Record<string, string> = { DRAFT: "#d1d5db", SENT: "#6b7280", APPROVED: INK, IN_PRODUCTION: "#f59e0b" };

export const CHART_TOOLTIP_STYLE = {
  borderRadius: 12,
  border: "1px solid #f3f4f6",
  boxShadow: "0 4px 12px rgb(0 0 0 / 0.08)",
  fontSize: 12,
};
