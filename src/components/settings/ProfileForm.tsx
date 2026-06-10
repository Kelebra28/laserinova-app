"use client";

import { useState, useTransition } from "react";
import { User, Mail, Lock, Save, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { updateProfileAction } from "@/app/dashboard/settings/actions";

interface Props {
  user: { id: string; name: string; email: string; role: string };
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  SELLER: "Vendedor",
};

export function ProfileForm({ user }: Props) {
  const [name,            setName]            = useState(user.name);
  const [email,           setEmail]           = useState(user.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword,     setNewPassword]     = useState("");
  const [showCurrent,     setShowCurrent]     = useState(false);
  const [showNew,         setShowNew]         = useState(false);
  const [toast,           setToast]           = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [isPending,       startTransition]    = useTransition();

  const showToast = (type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const res = await updateProfileAction(fd);
        if (res && !res.success) {
          showToast("err", res.error || "Error al actualizar el perfil");
        } else {
          setCurrentPassword("");
          setNewPassword("");
          showToast("ok", "Perfil actualizado correctamente");
        }
      } catch (err: any) {
        showToast("err", err.message ?? "Error al actualizar el perfil");
      }
    });
  };

  return (
    <div className="relative">
      {/* Toast */}
      {toast && (
        <div className={`absolute -top-14 right-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold shadow-lg transition-all ${
          toast.type === "ok"
            ? "bg-emerald-500 text-white shadow-emerald-500/25"
            : "bg-red-600 text-white shadow-red-600/25"
        }`}>
          {toast.type === "ok"
            ? <CheckCircle2 className="w-4 h-4" />
            : <AlertCircle className="w-4 h-4" />
          }
          {toast.msg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Role badge (read-only) */}
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-2xl border border-gray-100">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Rol actual</p>
            <p className="text-sm font-black text-gray-800">{ROLE_LABEL[user.role] ?? user.role}</p>
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
            Nombre completo
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
            <input
              name="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-gray-200 text-sm text-gray-900 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
            Correo electrónico
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
            <input
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-gray-200 text-sm text-gray-900 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all"
            />
          </div>
        </div>

        {/* Password section */}
        <div className="border-t border-gray-100 pt-5">
          <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
            <Lock className="w-3 h-3" />
            Cambiar contraseña
            <span className="text-gray-300 normal-case font-medium tracking-normal">(opcional)</span>
          </p>

          <div className="space-y-3">
            {/* Current password */}
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
              <input
                name="currentPassword"
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Contraseña actual"
                className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-gray-200 text-sm text-gray-900 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all"
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* New password */}
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
              <input
                name="newPassword"
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nueva contraseña (mín. 6 caracteres)"
                className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-gray-200 text-sm text-gray-900 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all"
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-sm font-black shadow-lg shadow-red-600/20 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-60 disabled:scale-100"
        >
          {isPending ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Guardar perfil
            </>
          )}
        </button>
      </form>
    </div>
  );
}
