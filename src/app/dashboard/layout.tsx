"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const isChatRoute = pathname?.startsWith('/dashboard/chats');

  return (
    <div className={`flex h-screen overflow-hidden ${isChatRoute ? 'bg-[#111b21]' : 'bg-gray-50'}`}>
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      <div className="flex flex-col flex-1 w-0 overflow-hidden">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className={isChatRoute ? "h-full w-full" : "py-4 px-4 sm:px-6 md:px-8"}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
