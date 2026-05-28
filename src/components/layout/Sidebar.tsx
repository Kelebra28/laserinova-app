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
  Mail
} from "lucide-react";
import { useSession } from "next-auth/react";
 
const menuItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Correo", href: "/dashboard/email", icon: Mail },
  { name: "Cotizaciones", href: "/dashboard/quotes", icon: FileText },
  { name: "Tareas", href: "/dashboard/tasks", icon: CheckSquare },
  { name: "Clientes", href: "/dashboard/clients", icon: Users },
  { name: "Finanzas", href: "/dashboard/finance", icon: DollarSign, adminOnly: true },
  { name: "Inventario", href: "/dashboard/inventory", icon: Box },
  { name: "Materiales", href: "/dashboard/materials", icon: Package },
  { name: "Procesos", href: "/dashboard/processes", icon: Cpu },
  { name: "Etiquetas", href: "/dashboard/labels", icon: Printer },
  { name: "Reportes", href: "/dashboard/reports", icon: PieChart },
  { name: "Configuración", href: "/dashboard/settings", icon: Settings, adminOnly: true },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
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
        fixed inset-y-0 left-0 z-50 w-64 bg-black text-white flex flex-col transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:flex
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <Link href="/dashboard" className="block w-full">
            <img
              src="/logo_sidebar.png"
              alt="Laser Inova Logo"
              className="w-full h-auto max-h-16 object-contain mx-auto"
            />
          </Link>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white md:hidden">
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            if (item.adminOnly && !isAdmin) return null;
            
            const isActive = item.href === "/dashboard" 
              ? pathname === "/dashboard" 
              : pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => onClose?.()}
                className={`
                  group flex items-center px-3 py-3 text-sm font-bold rounded-xl transition-all duration-200 uppercase tracking-widest
                  ${isActive 
                    ? "bg-red-600 text-white shadow-lg shadow-red-600/20" 
                    : "text-gray-400 hover:bg-gray-900 hover:text-white"
                  }
                `}
              >
                <item.icon
                  className={`mr-3 h-5 w-5 transition-colors ${
                    isActive ? "text-white" : "text-gray-500 group-hover:text-gray-300"
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
