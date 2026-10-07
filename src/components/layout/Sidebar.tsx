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
  MessageCircle
} from "lucide-react";
import { useSession } from "next-auth/react";
 
const menuItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permKey: "dashboard" },
  { name: "Chats", href: "/dashboard/chats", icon: MessageCircle, permKey: "chats" },
  { name: "Agente IA", href: "/dashboard/agent", icon: Bot, permKey: "agent" },
  { name: "Correo", href: "/dashboard/email", icon: Mail, permKey: "email" },
  { name: "Cotizaciones", href: "/dashboard/quotes", icon: FileText, permKey: "quotes" },
  { name: "Recibos", href: "/dashboard/receipts", icon: Receipt, permKey: "receipts" },
  { name: "Tareas", href: "/dashboard/tasks", icon: CheckSquare, permKey: "tasks" },
  { name: "Clientes", href: "/dashboard/clients", icon: Users, permKey: "clients" },
  { name: "Proveedores", href: "/dashboard/providers", icon: Building2, permKey: "providers" },
  { name: "Cobranza", href: "/dashboard/payment-requests", icon: Banknote, permKey: "payment_requests" },
  { name: "Finanzas", href: "/dashboard/finance", icon: DollarSign, permKey: "finance", adminOnly: true },
  { name: "Inventario", href: "/dashboard/inventory", icon: Box, permKey: "inventory" },
  { name: "Materiales", href: "/dashboard/materials", icon: Package, permKey: "materials" },
  { name: "Procesos", href: "/dashboard/processes", icon: Cpu, permKey: "processes" },
  { name: "Etiquetas", href: "/dashboard/labels", icon: Printer, permKey: "labels" },
  { name: "Encuestas", href: "/dashboard/surveys", icon: Star, permKey: "surveys", adminOnly: true },
  { name: "Reportes", href: "/dashboard/reports", icon: PieChart, permKey: "reports" },
  { name: "Usuarios", href: "/dashboard/users", icon: Users, adminOnly: true },
  { name: "Configuración", href: "/dashboard/settings", icon: Settings, adminOnly: true },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isAdmin = (session?.user as any)?.role === "ADMIN";

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
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-black/95 backdrop-blur-xl border-r border-white/10 text-white flex flex-col transition-transform duration-300 ease-in-out md:sticky md:top-0 md:h-screen md:translate-x-0 md:flex
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="flex items-center justify-between p-4 border-b border-white/10">
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

        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
          {status === "loading" ? null : menuItems.map((item) => {
            if (item.adminOnly && !isAdmin) return null;
            
            if (!isAdmin && item.permKey) {
              let permissions = (session?.user as any)?.permissions || {};
              if (typeof permissions === 'string') {
                try { permissions = JSON.parse(permissions); } catch(e) {}
              }
              if (permissions[item.permKey] === false) return null; // Ocultar si está explícitamente denegado
            }
            
            const isActive = item.href === "/dashboard" 
              ? pathname === "/dashboard" 
              : pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.name}
                href={item.href}
                prefetch={false}
                onClick={() => onClose?.()}
                className={`
                  group flex items-center px-3 py-3 text-xs font-bold rounded-xl transition-all duration-300 uppercase tracking-widest
                  ${isActive 
                    ? "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)] border border-red-500/50 scale-[1.02]" 
                    : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100 hover:scale-[1.02]"
                  }
                `}
              >
                <item.icon
                  className={`mr-3 h-5 w-5 transition-colors duration-300 ${
                    isActive ? "text-white" : "text-zinc-500 group-hover:text-red-400"
                  }`}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
