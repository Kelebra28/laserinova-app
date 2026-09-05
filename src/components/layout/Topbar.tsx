"use client";

import { signOut, useSession } from "next-auth/react";
import { LogOut, Menu, ShieldCheck, User as UserIcon } from "lucide-react";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Button } from "@/components/ui/Button";

interface TopbarProps {
  onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { data: session } = useSession();
  const user = session?.user as any;
  const name = user?.name || user?.email || "Usuario";
  const role = user?.role as string | undefined;
  const isAdmin = role === "ADMIN";

  return (
    <header className="sticky top-0 z-30 bg-white/70 dark:bg-black/40 backdrop-blur-md border-b border-zinc-200/50 dark:border-zinc-800/50 h-14 flex items-center justify-between px-4 sm:px-6 shrink-0 transition-colors duration-200">
      {/* Left: hamburger (mobile) */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="md:hidden text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Right: user info + logout */}
      <div className="flex items-center gap-3">
        {/* User identity pill */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 bg-zinc-50/80 dark:bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm transition-all hover:shadow-md">
          <UserAvatar name={name} size="sm" />

          {/* Name + role */}
          <div className="hidden sm:block">
            <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 leading-none">{name}</p>
            <p className={`text-[9px] font-black uppercase tracking-wider mt-0.5 flex items-center gap-0.5 ${
              isAdmin ? "text-indigo-600 dark:text-indigo-400" : "text-blue-600 dark:text-blue-400"
            }`}>
              {isAdmin
                ? <><ShieldCheck className="w-2.5 h-2.5" /> Admin</>
                : <><UserIcon className="w-2.5 h-2.5" /> Vendedor</>
              }
            </p>
          </div>
        </div>

        {/* Logout */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
