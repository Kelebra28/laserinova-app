"use client";

import React, { useState, useEffect } from "react";
import { getUsers, createUser, updateUser } from "@/server/actions/user.actions";
import { Users, UserPlus, Shield, Check, X, ShieldAlert, Loader2, Save } from "lucide-react";

const PERMISSION_MODULES = [
  { key: "dashboard", label: "Dashboard" },
  { key: "chats", label: "Chats" },
  { key: "agent", label: "Agente IA" },
  { key: "email", label: "Correo" },
  { key: "quotes", label: "Cotizaciones" },
  { key: "receipts", label: "Recibos" },
  { key: "tasks", label: "Tareas" },
  { key: "clients", label: "Clientes" },
  { key: "providers", label: "Proveedores" },
  { key: "payment_requests", label: "Cobranza" },
  { key: "finance", label: "Finanzas" },
  { key: "inventory", label: "Inventario" },
  { key: "materials", label: "Materiales" },
  { key: "processes", label: "Procesos" },
  { key: "labels", label: "Etiquetas" },
  { key: "surveys", label: "Encuestas" },
  { key: "reports", label: "Reportes" },
];

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  // New user form state
  const [isCreating, setIsCreating] = useState(false);
  const [newUserData, setNewUserData] = useState({ name: "", email: "", password: "", role: "SELLER" });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const res = await getUsers();
    if (res.success && res.data) {
      setUsers(res.data);
    }
    setLoading(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingId("new");
    const res = await createUser(newUserData);
    if (res.success) {
      setIsCreating(false);
      setNewUserData({ name: "", email: "", password: "", role: "SELLER" });
      await fetchUsers();
    } else {
      alert("Error: " + res.error);
    }
    setSavingId(null);
  };

  const handleTogglePermission = async (userId: string, currentPerms: any, key: string, newValue: boolean) => {
    const updatedPerms = { ...currentPerms, [key]: newValue };
    setUsers(users.map(u => u.id === userId ? { ...u, permissions: updatedPerms } : u));
    
    setSavingId(userId);
    await updateUser(userId, { permissions: updatedPerms });
    setSavingId(null);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    setSavingId(userId);
    await updateUser(userId, { role: newRole });
    setSavingId(null);
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-red-600" />
            Gestión de Usuarios
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            Administra los accesos y permisos de tu equipo
          </p>
        </div>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-slate-900/20 transition-all active:scale-95"
        >
          {isCreating ? <X className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
          {isCreating ? "Cancelar" : "Nuevo Usuario"}
        </button>
      </div>

      {/* Create Form */}
      {isCreating && (
        <form onSubmit={handleCreateUser} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 animate-in slide-in-from-top-4">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Registrar Nuevo Usuario</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nombre</label>
              <input required type="text" value={newUserData.name} onChange={e => setNewUserData({...newUserData, name: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none transition" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Correo</label>
              <input required type="email" value={newUserData.email} onChange={e => setNewUserData({...newUserData, email: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none transition" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Contraseña</label>
              <input required type="password" value={newUserData.password} onChange={e => setNewUserData({...newUserData, password: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none transition" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Rol</label>
              <select value={newUserData.role} onChange={e => setNewUserData({...newUserData, role: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none transition font-medium">
                <option value="SELLER">Empleado (Vendedor)</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button type="submit" disabled={savingId === "new"} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-md shadow-red-200 transition-all active:scale-95 disabled:opacity-50">
              {savingId === "new" ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Guardar Usuario
            </button>
          </div>
        </form>
      )}

      {/* Users List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-6">
          {users.map((user) => {
            const isAdmin = user.role === "ADMIN";
            const perms = user.permissions || {};

            return (
              <div key={user.id} className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
                {/* User Header */}
                <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-white font-bold text-xl shadow-inner">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">{user.name}</h3>
                      <p className="text-slate-500 text-sm">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rol:</span>
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className={`text-sm font-bold px-3 py-1.5 rounded-lg border outline-none transition ${isAdmin ? 'bg-indigo-50 text-indigo-700 border-indigo-200 focus:ring-indigo-500' : 'bg-slate-100 text-slate-700 border-slate-200 focus:ring-slate-500'}`}
                      >
                        <option value="SELLER">EMPLEADO</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </div>
                    {savingId === user.id && <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />}
                  </div>
                </div>

                {/* Permissions Grid */}
                <div className="p-6">
                  {isAdmin ? (
                    <div className="flex items-center justify-center gap-3 p-8 bg-indigo-50/50 border border-indigo-100 rounded-xl text-indigo-700">
                      <ShieldAlert className="w-6 h-6" />
                      <p className="font-semibold text-sm">Los Administradores tienen acceso absoluto a todos los módulos del sistema.</p>
                    </div>
                  ) : (
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-slate-400" />
                        Permisos de Módulos
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {PERMISSION_MODULES.map((mod) => {
                          const hasAccess = perms[mod.key] !== false; // Default true if undefined
                          
                          return (
                            <label
                              key={mod.key}
                              className={`relative flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 group hover:shadow-sm ${
                                hasAccess 
                                  ? 'border-red-500/30 bg-red-50/50' 
                                  : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                              }`}
                            >
                              <span className={`text-sm font-semibold select-none transition-colors ${hasAccess ? 'text-red-900' : 'text-slate-500'}`}>
                                {mod.label}
                              </span>
                              
                              {/* Switch UI */}
                              <div className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out flex shrink-0 ${hasAccess ? 'bg-red-500' : 'bg-slate-300'}`}>
                                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out ${hasAccess ? 'translate-x-5' : 'translate-x-0'}`} />
                              </div>
                              
                              {/* Hidden real checkbox */}
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={hasAccess}
                                onChange={(e) => handleTogglePermission(user.id, perms, mod.key, e.target.checked)}
                              />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
