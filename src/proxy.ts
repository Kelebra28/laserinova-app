import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const menuMap = [
  { href: "/dashboard/chats", permKey: "chats" },
  { href: "/dashboard/agent", permKey: "agent" },
  { href: "/dashboard/email", permKey: "email" },
  { href: "/dashboard/quotes", permKey: "quotes" },
  { href: "/dashboard/receipts", permKey: "receipts" },
  { href: "/dashboard/tasks", permKey: "tasks" },
  { href: "/dashboard/clients", permKey: "clients" },
  { href: "/dashboard/providers", permKey: "providers" },
  { href: "/dashboard/payment-requests", permKey: "payment_requests" },
  { href: "/dashboard/finance", adminOnly: true },
  { href: "/dashboard/inventory", permKey: "inventory" },
  { href: "/dashboard/materials", permKey: "materials" },
  { href: "/dashboard/processes", permKey: "processes" },
  { href: "/dashboard/labels", permKey: "labels" },
  { href: "/dashboard/surveys", adminOnly: true },
  { href: "/dashboard/reports", permKey: "reports" },
  { href: "/dashboard/users", adminOnly: true },
  { href: "/dashboard/settings", adminOnly: true },
  { href: "/dashboard", permKey: "dashboard" }, // Debe ir al final para que el prefix match no atrape a los demás
];

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    if (pathname.startsWith("/login") && token) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (pathname.startsWith("/dashboard") && token) {
      const role = token.role as string;
      const isAdmin = role === "ADMIN";
      
      if (!isAdmin) {
        let permissions: Record<string, boolean> = {};
        if (typeof token.permissions === 'string') {
          try { permissions = JSON.parse(token.permissions); } catch(e) {}
        } else if (token.permissions) {
          permissions = token.permissions as Record<string, boolean>;
        }

        // Buscar qué módulo están intentando acceder
        const matchedModule = menuMap.find(m => pathname === m.href || pathname.startsWith(m.href + "/"));

        if (matchedModule) {
          const isDenied = matchedModule.adminOnly || (matchedModule.permKey && permissions[matchedModule.permKey] === false);
          
          if (isDenied) {
            // Buscar el primer módulo al que sí tengan acceso
            const firstAllowed = menuMap.find(m => !m.adminOnly && m.permKey && permissions[m.permKey] !== false);
            
            if (firstAllowed) {
              return NextResponse.redirect(new URL(firstAllowed.href, req.url));
            } else {
              // Si no tiene acceso a NADA (muy raro), se podría desloguear o mandar a una vista especial
              // Por ahora lo mandamos a login para evitar loop infinito
              return NextResponse.redirect(new URL("/login", req.url));
            }
          }
        }
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
