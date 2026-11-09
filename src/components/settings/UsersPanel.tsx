"use client";

import { useState, useTransition } from "react";
import {
  Users, UserPlus, Pencil, Power, X, Save, Eye, EyeOff,
  CheckCircle2, AlertCircle, ShieldCheck, User, Trash2
} from "lucide-react";
import toast from "react-hot-toast";
import { ConfirmModal } from "@/components/tasks/ConfirmModal";
import { createUserAction, updateUserAction, toggleUserActiveAction, deleteUserAction } from "@/app/dashboard/settings/actions";

interface AppUser {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
}

interface Props {
  users: AppUser[];
  currentUserId: string;
}

const AVATAR_GRADIENTS = [
  "from-red-500 to-rose-600",
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-violet-500 to-purple-600",
  "from-amber-500 to-orange-600",
];

function avatarGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function avatarInitials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

// ─── Edit User Modal ──────────────────────────────────────────────────────────

function EditUserModal({
  user,
  onClose,
  onSaved,
}: {
  user: AppUser;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [showPwd, setShowPwd] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await updateUserAction(fd);
        onSaved();
        onClose();
      } catch (err: any) {
        setError(err.message ?? "Error al actualizar");
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
        style={{ animation: "modalIn 0.2s cubic-bezier(0.34,1.56,0.64,1) both" }}
      >
        <div className="h-1 w-full bg-gradient-to-r from-red-500 to-rose-600" />

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarGradient(user.name)} text-white text-sm font-black flex items-center justify-center`}>
              {avatarInitials(user.name)}
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900">Editar usuario</h2>
              <p className="text-xs text-gray-400">{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <input type="hidden" name="userId" value={user.id} />

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700 font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Nombre</label>
            <input
              name="name"
              defaultValue={user.name}
              required
              className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 text-sm text-gray-900 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Email</label>
            <input
              name="email"
              type="email"
              defaultValue={user.email}
              required
              className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 text-sm text-gray-900 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all"
            />
          </div>

          {/* Role & Active row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Rol</label>
              <select
                name="role"
                defaultValue={user.role}
                className="w-full px-3 py-2.5 rounded-2xl border border-gray-200 text-sm text-gray-900 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all cursor-pointer"
              >
                <option value="ADMIN">Administrador</option>
                <option value="SELLER">Vendedor</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Estado</label>
              <select
                name="active"
                defaultValue={user.active ? "true" : "false"}
                className="w-full px-3 py-2.5 rounded-2xl border border-gray-200 text-sm text-gray-900 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all cursor-pointer"
              >
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
            </div>
          </div>

          {/* Reset password */}
          <div className="border-t border-gray-100 pt-4">
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
              Nueva contraseña <span className="text-gray-300 normal-case font-medium tracking-normal">(opcional)</span>
            </label>
            <div className="relative">
              <input
                name="newPassword"
                type={showPwd ? "text" : "password"}
                placeholder="Dejar vacío para no cambiar"
                className="w-full px-4 pr-10 py-2.5 rounded-2xl border border-gray-200 text-sm text-gray-900 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all"
              />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-2xl border-2 border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white text-sm font-black shadow-lg shadow-red-600/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60"
            >
              {isPending ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              {isPending ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
      <style>{`@keyframes modalIn { from { opacity:0; transform:scale(0.9) translateY(12px); } to { opacity:1; transform:scale(1) translateY(0); } }`}</style>
    </div>
  );
}

// ─── Create User Modal ────────────────────────────────────────────────────────

function CreateUserModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [showPwd, setShowPwd] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await createUserAction(fd);
        onSaved();
        onClose();
      } catch (err: any) {
        setError(err.message ?? "Error al crear usuario");
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
        style={{ animation: "modalIn 0.2s cubic-bezier(0.34,1.56,0.64,1) both" }}
      >
        <div className="h-1 w-full bg-gradient-to-r from-red-500 to-rose-600" />

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-black text-gray-900">Nuevo usuario</h2>
            <p className="text-xs text-gray-400">Completa los datos del nuevo miembro</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700 font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Nombre completo</label>
            <input name="name" required placeholder="Ej. Juan Pérez" className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 text-sm bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all" />
          </div>

          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Email</label>
            <input name="email" type="email" required placeholder="correo@laserinova.com" className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 text-sm bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all" />
          </div>

          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Rol</label>
            <select name="role" className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 text-sm bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all cursor-pointer">
              <option value="SELLER">Vendedor</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Contraseña inicial</label>
            <div className="relative">
              <input
                name="password"
                type={showPwd ? "text" : "password"}
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-4 pr-10 py-2.5 rounded-2xl border border-gray-200 text-sm bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all"
              />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-2xl border-2 border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all">Cancelar</button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white text-sm font-black shadow-lg shadow-red-600/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60"
            >
              {isPending ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {isPending ? "Creando..." : "Crear usuario"}
            </button>
          </div>
        </form>
      </div>
      <style>{`@keyframes modalIn { from { opacity:0; transform:scale(0.9) translateY(12px); } to { opacity:1; transform:scale(1) translateY(0); } }`}</style>
    </div>
  );
}

// ─── Main Users Panel ─────────────────────────────────────────────────────────

export function UsersPanel({ users: initialUsers, currentUserId }: Props) {
  const [users, setUsers]       = useState<AppUser[]>(initialUsers);
  const [editingUser, setEdit]  = useState<AppUser | null>(null);
  const [showCreate, setCreate] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);

  const handleToggle = (user: AppUser) => {
    const newActive = !user.active;
    setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, active: newActive } : u));
    startTransition(() => toggleUserActiveAction(user.id, newActive));
  };

  const handleDelete = () => {
    if (!userToDelete) return;
    const user = userToDelete;
    startTransition(async () => {
      const res = await deleteUserAction(user.id);
      if (res.success) {
        setUsers((prev) => prev.filter((u) => u.id !== user.id));
        toast.success(`Usuario "${user.name}" eliminado`);
      } else {
        toast.error(res.error ?? "No se pudo eliminar el usuario");
      }
      setUserToDelete(null);
    });
  };

  const refreshAfterSave = () => {
    // Revalidation happens server-side; for optimistic UI we just reload users list by re-fetching
    // In practice Next.js revalidatePath will update on next navigation
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-500" />
          <p className="text-sm font-black text-gray-600 uppercase tracking-widest">
            Usuarios del sistema <span className="ml-1 text-xs font-bold text-gray-400">({users.length})</span>
          </p>
        </div>
        <button
          onClick={() => setCreate(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-md shadow-red-600/20 transition-all hover:scale-105 active:scale-95"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Nuevo usuario
        </button>
      </div>

      {/* User cards */}
      <div className="space-y-3">
        {users.map((user) => {
          const isMe = user.id === currentUserId;
          const gradient = avatarGradient(user.name);
          const initials = avatarInitials(user.name);

          return (
            <div
              key={user.id}
              className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                user.active ? "bg-white border-gray-100" : "bg-gray-50 border-gray-100 opacity-60"
              }`}
            >
              {/* Avatar */}
              <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${gradient} text-white text-sm font-black flex items-center justify-center shadow-sm flex-shrink-0`}>
                {initials}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-black text-gray-900 truncate">{user.name}</p>
                  {isMe && (
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-red-100 text-red-600 rounded-full">
                      Tú
                    </span>
                  )}
                  <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    user.role === "ADMIN" ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"
                  }`}>
                    {user.role === "ADMIN" ? <ShieldCheck className="w-2.5 h-2.5" /> : <User className="w-2.5 h-2.5" />}
                    {user.role === "ADMIN" ? "Admin" : "Vendedor"}
                  </span>
                  {!user.active && (
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-gray-200 text-gray-500 rounded-full">
                      Inactivo
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 truncate mt-0.5">{user.email}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setEdit(user)}
                  className="p-2 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                  title="Editar"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                {!isMe && (
                  <button
                    onClick={() => handleToggle(user)}
                    disabled={isPending}
                    className={`p-2 rounded-xl transition-all ${
                      user.active
                        ? "text-gray-400 hover:text-red-600 hover:bg-red-50"
                        : "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                    }`}
                    title={user.active ? "Desactivar" : "Activar"}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                )}
                {!isMe && (
                  <button
                    onClick={() => setUserToDelete(user)}
                    disabled={isPending}
                    className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      {userToDelete && (
        <ConfirmModal
          title={`¿Eliminar a ${userToDelete.name}?`}
          message="Sus cotizaciones, proveedores y recibos pasarán a tu usuario. Esta acción no se puede deshacer."
          confirmLabel="Sí, eliminar"
          loading={isPending}
          onConfirm={handleDelete}
          onCancel={() => setUserToDelete(null)}
        />
      )}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEdit(null)}
          onSaved={refreshAfterSave}
        />
      )}
      {showCreate && (
        <CreateUserModal
          onClose={() => setCreate(false)}
          onSaved={refreshAfterSave}
        />
      )}
    </div>
  );
}
