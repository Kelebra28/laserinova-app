"use client";

import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, AlertCircle, Loader2, Zap } from "lucide-react";

export default function LoginPage() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPwd,  setShowPwd]  = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Forzamos al router a purgar la caché y actualizar los tokens (CSRF) 
    // en caso de que el usuario haya sido redirigido aquí tras expirar su sesión.
    router.refresh();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) {
      setError("Correo o contraseña incorrectos");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* ── Left panel — decorative ───────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-red-600 via-rose-600 to-orange-500 flex-col justify-between p-12 relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 -left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-0 w-56 h-56 bg-black/10 rounded-full blur-3xl" />
        </div>

        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-black text-xl tracking-tight">Laser Inova</span>
          </div>
          <p className="text-white/60 text-sm font-medium">Sistema de Gestión CRM</p>
        </div>

        <div className="relative space-y-6">
          <h2 className="text-4xl font-black text-white leading-tight">
            Gestiona tu negocio<br />
            con precisión<br />
            <span className="text-white/50">y trazabilidad.</span>
          </h2>
          <div className="flex flex-col gap-3">
            {[
              "Cotizaciones con folio automático",
              "Control financiero en tiempo real",
              "Gestión de tareas en equipo",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-white/80 text-sm font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-white/30 text-xs font-medium">v2.0 · Uso interno</p>
      </div>

      {/* ── Right panel — form ────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile brand */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center shadow-md shadow-red-600/25">
              <Zap className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-black text-gray-900 text-lg">Laser Inova</span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Bienvenido 👋</h1>
            <p className="text-gray-400 text-sm mt-1.5 font-medium">Ingresa con tu cuenta para continuar</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700 font-medium mb-5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@laserinova.com"
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-gray-900 placeholder-gray-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all shadow-sm"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-11 rounded-2xl border border-gray-200 bg-white text-gray-900 placeholder-gray-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-black text-sm shadow-lg shadow-red-600/25 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-60 disabled:scale-100 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verificando...
                </>
              ) : "Iniciar sesión →"}
            </button>
          </form>

          <p className="text-center text-xs text-gray-300 mt-8 font-medium">
            Laser Inova · Sistema interno · v2.0
          </p>
        </div>
      </div>
    </div>
  );
}
