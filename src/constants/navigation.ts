/**
 * Módulos del dashboard: única fuente para el menú (Sidebar), el guard de rutas (src/proxy.ts)
 * y la pantalla de permisos de usuarios. Solo datos: el proxy lo importa, así que aquí
 * no van íconos ni componentes (los íconos viven en Sidebar.tsx, por `href`).
 */

export type PermissionKey =
  | "dashboard"
  | "chats"
  | "agent"
  | "email"
  | "quotes"
  | "receipts"
  | "tasks"
  | "clients"
  | "providers"
  | "payment_requests"
  | "inventory"
  | "products"
  | "materials"
  | "processes"
  | "labels"
  | "reports";

export type NavRoute = {
  href: string;
  label: string;
  /** Permiso que la controla. Si el usuario lo tiene en `false` explícito, no entra. */
  permKey?: PermissionKey;
  /** Solo administradores, sin importar permisos. */
  adminOnly?: boolean;
  /** Se marca activa solo con la ruta exacta (no con sus subrutas). */
  exact?: boolean;
};

/** En el orden del menú. */
export const NAV_ROUTES: NavRoute[] = [
  { href: "/dashboard", label: "Dashboard", permKey: "dashboard", exact: true },
  { href: "/dashboard/chats", label: "Chats", permKey: "chats" },
  { href: "/dashboard/agent", label: "Agente IA", permKey: "agent", exact: true },
  { href: "/dashboard/agent/knowledge", label: "Cerebro IA", adminOnly: true },
  { href: "/dashboard/email", label: "Correo", permKey: "email" },
  { href: "/dashboard/quotes", label: "Cotizaciones", permKey: "quotes" },
  { href: "/dashboard/receipts", label: "Recibos", permKey: "receipts" },
  { href: "/dashboard/tasks", label: "Tareas", permKey: "tasks" },
  { href: "/dashboard/clients", label: "Clientes", permKey: "clients" },
  { href: "/dashboard/providers", label: "Proveedores", permKey: "providers" },
  { href: "/dashboard/payment-requests", label: "Cobranza", permKey: "payment_requests" },
  { href: "/dashboard/finance", label: "Finanzas", adminOnly: true },
  { href: "/dashboard/inventory", label: "Inventario", permKey: "inventory" },
  { href: "/dashboard/products", label: "Productos", permKey: "products" },
  { href: "/dashboard/materials", label: "Materiales", permKey: "materials" },
  { href: "/dashboard/processes", label: "Procesos", permKey: "processes" },
  { href: "/dashboard/labels", label: "Etiquetas", permKey: "labels" },
  { href: "/dashboard/surveys", label: "Encuestas", adminOnly: true },
  { href: "/dashboard/reports", label: "Reportes", permKey: "reports" },
  { href: "/dashboard/data-analytics", label: "Datos & Analytics", permKey: "reports" },
  { href: "/dashboard/users", label: "Usuarios", adminOnly: true },
  { href: "/dashboard/settings", label: "Configuración", adminOnly: true },
];

/** Permisos que se pueden prender/apagar por usuario (en el orden del menú, sin repetir). */
export const PERMISSION_MODULES: { key: PermissionKey; label: string }[] = (() => {
  const seen = new Set<PermissionKey>();
  const list: { key: PermissionKey; label: string }[] = [];
  for (const r of NAV_ROUTES) {
    if (!r.permKey || r.adminOnly || seen.has(r.permKey)) continue;
    seen.add(r.permKey);
    list.push({ key: r.permKey, label: r.label });
  }
  return list;
})();

/** Permisos de un empleado nuevo: todo prendido (se apaga después desde Usuarios). */
export const DEFAULT_PERMISSIONS: Record<PermissionKey, boolean> = Object.fromEntries(
  PERMISSION_MODULES.map((m) => [m.key, true])
) as Record<PermissionKey, boolean>;

/** La ruta del menú que corresponde a un pathname (la más específica gana). */
export function findNavRoute(pathname: string): NavRoute | undefined {
  let best: NavRoute | undefined;
  for (const r of NAV_ROUTES) {
    if (pathname === r.href || pathname.startsWith(r.href + "/")) {
      if (!best || r.href.length > best.href.length) best = r;
    }
  }
  return best;
}

/** ¿El link del menú se marca como activo en este pathname? */
export function isNavActive(route: NavRoute, pathname: string): boolean {
  return route.exact ? pathname === route.href : pathname === route.href || pathname.startsWith(route.href + "/");
}
