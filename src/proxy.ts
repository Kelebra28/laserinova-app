import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { canAccessPath, firstAllowedRoute, isAdminRole, parsePermissions } from "@/lib/permissions";

export default withAuth(
  function proxy(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    if (pathname.startsWith("/login") && token) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (pathname.startsWith("/dashboard") && token) {
      const isAdmin = isAdminRole(token.role);
      const permissions = parsePermissions(token.permissions);

      if (!canAccessPath(pathname, isAdmin, permissions)) {
        const firstAllowed = firstAllowedRoute(isAdmin, permissions);
        // Sin acceso a NADA (muy raro): a login para evitar un loop de redirecciones.
        return NextResponse.redirect(new URL(firstAllowed?.href ?? "/login", req.url));
      }
    }
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        if (req.nextUrl.pathname.startsWith("/dashboard")) {
          return !!token;
        }
        return true;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
