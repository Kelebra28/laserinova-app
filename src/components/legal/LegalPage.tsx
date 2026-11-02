import Link from "next/link";

export const LEGAL_CONTACT_EMAIL = "laserinova23@gmail.com";
export const LEGAL_UPDATED_AT = "2 de noviembre de 2026";

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-gray-700">{children}</div>
    </section>
  );
}

export default function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10">
      <Link href="/login" className="text-sm font-medium text-red-600 hover:underline">
        ← Laser Inova
      </Link>
      <article className="mt-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-10">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="mt-1 text-xs text-gray-500">Última actualización: {LEGAL_UPDATED_AT}</p>
        {children}
      </article>
      <nav className="mt-6 flex justify-center gap-4 text-xs text-gray-500">
        <Link href="/privacidad" className="hover:underline">Aviso de privacidad</Link>
        <Link href="/terminos" className="hover:underline">Términos del servicio</Link>
      </nav>
    </main>
  );
}
