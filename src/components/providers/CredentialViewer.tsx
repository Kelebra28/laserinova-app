"use client";

import React, { useState } from "react";
import { Eye, EyeOff, Loader2, Copy, Check } from "lucide-react";
import { decryptPasswordAction } from "@/app/dashboard/providers/actions";

interface CredentialViewerProps {
  encryptedValue: string;
}

export default function CredentialViewer({ encryptedValue }: CredentialViewerProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [decryptedValue, setDecryptedValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleToggle = async () => {
    if (showPassword) {
      setShowPassword(false);
      return;
    }

    if (decryptedValue) {
      setShowPassword(true);
      return;
    }

    setIsLoading(true);
    try {
      const res = await decryptPasswordAction(encryptedValue);
      if (res.success && res.decrypted) {
        setDecryptedValue(res.decrypted);
        setShowPassword(true);
      } else {
        alert(res.error || "No se pudo descifrar la credencial");
      }
    } catch (err) {
      console.error(err);
      alert("Error al conectar con el servidor");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    const textToCopy = decryptedValue || "";
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("No se pudo copiar", err);
    }
  };

  return (
    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 min-w-0">
      <span className="text-xs font-mono font-bold text-slate-700 truncate select-all">
        {showPassword ? decryptedValue : "••••••••••••"}
      </span>
      
      <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
        <button
          type="button"
          onClick={handleToggle}
          disabled={isLoading}
          className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
          title={showPassword ? "Ocultar credencial" : "Revelar credencial"}
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : showPassword ? (
            <EyeOff className="w-3.5 h-3.5" />
          ) : (
            <Eye className="w-3.5 h-3.5" />
          )}
        </button>

        {showPassword && (
          <button
            type="button"
            onClick={handleCopy}
            className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
            title="Copiar contraseña"
          >
            {isCopied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600 animate-in fade-in" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
