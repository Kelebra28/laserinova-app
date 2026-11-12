/**
 * Reglas de acceso compartidas por el proxy (src/proxy.ts, guard de rutas) y el Sidebar (qué se muestra).
 * Sin dependencias de servidor: se ejecuta en el proxy y en el navegador.
 */
import { NAV_ROUTES, findNavRoute, type NavRoute } from "@/constants/navigation";

export const ROLES = { ADMIN: "ADMIN", SUPERADMIN: "SUPERADMIN", SELLER: "SELLER" } as const;

export type Permissions = Record<string, boolean>;

/** ADMIN y SUPERADMIN ven todo y no se les aplican permisos. */
export function isAdminRole(role: unknown): boolean {
  const r = String(role ?? "").toUpperCase();
  return r === ROLES.ADMIN || r === ROLES.SUPERADMIN;
}

/** Los permisos llegan en el token como objeto o como JSON en texto (según de dónde salió la sesión). */
export function parsePermissions(raw: unknown): Permissions {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? (parsed as Permissions) : {};
    } catch {
      return {};
    }
  }
  return typeof raw === "object" ? (raw as Permissions) : {};
}

/** Un permiso solo niega si está en `false` explícito: los módulos nuevos quedan abiertos a quien no los tenga guardados. */
export function canAccessRoute(route: NavRoute, isAdmin: boolean, permissions: Permissions): boolean {
  if (isAdmin) return true;
  if (route.adminOnly) return false;
  return !(route.permKey && permissions[route.permKey] === false);
}

/** ¿Puede entrar a este pathname? Rutas fuera del menú quedan permitidas (solo requieren sesión). */
export function canAccessPath(pathname: string, isAdmin: boolean, permissions: Permissions): boolean {
  const route = findNavRoute(pathname);
  return !route || canAccessRoute(route, isAdmin, permissions);
}

/** Primer módulo del menú al que sí tiene acceso (para redirigir cuando le niegan uno). */
export function firstAllowedRoute(isAdmin: boolean, permissions: Permissions): NavRoute | undefined {
  return NAV_ROUTES.find((r) => canAccessRoute(r, isAdmin, permissions));
}
