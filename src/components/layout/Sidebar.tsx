"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  Settings, 
  FileText, 
  PieChart,
  DollarSign,
  Cpu,
  X,
  CheckSquare,
  Box,
  Printer,
  Mail,
  Building2,
  Receipt,
  Star,
  Banknote,
  Bot,
  MessageCircle,
  BrainCircuit,
  Database,
  type LucideIcon,
} from "lucide-react";
import { useSession } from "next-auth/react";
 
import { NAV_ROUTES, isNavActive } from "@/constants/navigation";
import { canAccessRoute, isAdminRole, parsePermissions } from "@/lib/permissions";

// Íconos del menú por ruta; rutas, etiquetas y permisos salen de constants/navigation.
const NAV_ICONS: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/dashboard/chats": MessageCircle,
  "/dashboard/agent": Bot,
  "/dashboard/agent/knowledge": BrainCircuit,
  "/dashboard/email": Mail,
  "/dashboard/quotes": FileText,
  "/dashboard/receipts": Receipt,
  "/dashboard/tasks": CheckSquare,
  "/dashboard/clients": Users,
  "/dashboard/providers": Building2,
  "/dashboard/payment-requests": Banknote,
  "/dashboard/finance": DollarSign,
  "/dashboard/inventory": Box,
  "/dashboard/products": Package,
  "/dashboard/materials": Package,
  "/dashboard/processes": Cpu,
  "/dashboard/labels": Printer,
  "/dashboard/surveys": Star,
  "/dashboard/reports": PieChart,
  "/dashboard/data-analytics": Database,
  "/dashboard/users": Users,
  "/dashboard/settings": Settings,
};

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const user = session?.user as { role?: string; permissions?: unknown } | undefined;
  const isAdmin = isAdminRole(user?.role);
  const permissions = parsePermissions(user?.permissions);

  return (
    <>
      {/* Mobile Backdrop */}
      <div 
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 md:hidden ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Sidebar Container */}
      <div 
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-black/95 backdrop-blur-xl border-r border-white/10 text-white flex flex-col transition-transform duration-300 ease-in-out md:sticky md:top-0 md:translate-x-0 md:flex
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        style={{ height: "100vh", maxHeight: "100vh", overflow: "hidden" }}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
          <Link href="/dashboard" className="block w-full transition-transform hover:scale-105 duration-300">
            <img
              src="/logo_sidebar.png"
              alt="Laser Inova Logo"
              className="w-full h-auto max-h-16 object-contain mx-auto drop-shadow-md"
            />
          </Link>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white md:hidden transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav 
          className="flex-1 min-h-0 px-3 py-4 space-y-0.5 custom-scrollbar"
          style={{ 
            height: "calc(100vh - 80px)", 
            maxHeight: "calc(100vh - 80px)", 
            overflowY: "scroll", 
            WebkitOverflowScrolling: "touch",
            paddingBottom: "120px"
          }}
        >
          {status === "loading" ? null : NAV_ROUTES.map((item) => {
            if (!canAccessRoute(item, isAdmin, permissions)) return null;
            const Icon = NAV_ICONS[item.href] ?? LayoutDashboard;
            const isActive = isNavActive(item, pathname);

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                onClick={() => onClose?.()}
                className={`
                  group relative flex items-center px-3 py-2.5 text-[13px] font-medium rounded-xl transition-colors duration-200
                  ${isActive 
                    ? "bg-red-600/15 text-white ring-1 ring-red-500/30" 
                    : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
                  }
                `}
              >
                {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-red-500" />}
                <Icon
                  className={`mr-3 h-[18px] w-[18px] shrink-0 transition-colors duration-200 ${
                    isActive ? "text-red-400" : "text-zinc-500 group-hover:text-zinc-300"
                  }`}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
