"use client";

import React, { useState, useTransition } from "react";
import { Mail, Save, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { updateUserEmailConfigAction } from "@/app/dashboard/settings/actions";

interface EmailConfigFormProps {
  incomingServer?: string | null;
  outgoingServer?: string | null;
}

export function EmailConfigForm({ incomingServer, outgoingServer }: EmailConfigFormProps) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await updateUserEmailConfigAction(formData);
        setStatus({
          type: "success",
          message: "¡Configuración de correo guardada con éxito!",
        });
      } catch (error: any) {
        setStatus({
          type: "error",
          message: error.message || "Hubo un error al intentar guardar.",
        });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {status && (
        <div
          className={`flex items-center gap-3 p-4 rounded-2xl text-xs font-semibold border animate-in fade-in slide-in-from-top-1 ${
            status.type === "success"
              ? "bg-emerald-50 border-emerald-100 text-emerald-800"
              : "bg-red-50 border-red-100 text-red-800"
          }`}
        >
          {status.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
          )}
          <span>{status.message}</span>
        </div>
      )}

      <div className="space-y-2">
        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
          Servidor Entrante (IMAP)
        </label>
        <input
          type="text"
          name="imapServer"
          defaultValue={incomingServer || "imap.hostinger.com"}
          className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all font-medium"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
          Servidor Saliente (SMTP)
        </label>
        <input
          type="text"
          name="smtpServer"
          defaultValue={outgoingServer || "smtp.hostinger.com"}
          className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all font-medium"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
          Contraseña de Correo (Hostinger)
        </label>
        <input
          type="password"
          name="emailPassword"
          placeholder="••••••••••••"
          className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all font-medium"
        />
        <p className="text-[10px] text-gray-400 font-medium">
          Tu correo de Hostinger debe ser el mismo de tu perfil. Se guardará de forma encriptada.
        </p>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white text-xs font-black shadow-md transition-all active:scale-95 disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Save className="w-4 h-4" />
        )}
        {isPending ? "Guardando..." : "Guardar correo Hostinger"}
      </button>
    </form>
  );
}
