"use client";

import { useState } from "react";
import { User, Users, Mail, SlidersHorizontal, HardDrive } from "lucide-react";

interface Props {
  profileContent: React.ReactNode;
  usersContent: React.ReactNode;
  emailContent: React.ReactNode;
  systemContent: React.ReactNode;
  costsContent: React.ReactNode;
}

export function SettingsTabs({ 
  profileContent,
  usersContent, 
  emailContent,
  systemContent,
  costsContent 
}: Props) {
  const [activeTab, setActiveTab] = useState<"profile" | "users" | "email" | "costs" | "system">("profile");

  return (
    <div className="space-y-6">
      {/* Tabs Header */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 pb-4">
        {/* Mi Perfil */}
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold uppercase tracking-wider transition-all ${
            activeTab === "profile"
              ? "bg-red-50 text-red-700 shadow-sm ring-1 ring-red-200/50 font-black"
              : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
          }`}
        >
          <User className="w-4 h-4" /> Mi Perfil
        </button>

        {/* Usuarios del Sistema */}
        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold uppercase tracking-wider transition-all ${
            activeTab === "users"
              ? "bg-violet-50 text-violet-700 shadow-sm ring-1 ring-violet-200/50 font-black"
              : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
          }`}
        >
          <Users className="w-4 h-4" /> Usuarios del Sistema
        </button>

        {/* Configuración de Email */}
        <button
          onClick={() => setActiveTab("email")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold uppercase tracking-wider transition-all ${
            activeTab === "email"
              ? "bg-teal-50 text-teal-700 shadow-sm ring-1 ring-teal-200/50 font-black"
              : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
          }`}
        >
          <Mail className="w-4 h-4" /> Configuración de Email
        </button>

        {/* Gastos y Costos */}
        <button
          onClick={() => setActiveTab("costs")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold uppercase tracking-wider transition-all ${
            activeTab === "costs"
              ? "bg-amber-50 text-amber-700 shadow-sm ring-1 ring-amber-200/50 font-black"
              : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" /> Gastos y Costos
        </button>

        {/* Almacenamiento */}
        <button
          onClick={() => setActiveTab("system")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold uppercase tracking-wider transition-all ${
            activeTab === "system"
              ? "bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-200/50 font-black"
              : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
          }`}
        >
          <HardDrive className="w-4 h-4" /> Almacenamiento
        </button>
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {activeTab === "profile" && profileContent}
        {activeTab === "users" && usersContent}
        {activeTab === "email" && emailContent}
        {activeTab === "costs" && costsContent}
        {activeTab === "system" && systemContent}
      </div>
    </div>
  );
}
