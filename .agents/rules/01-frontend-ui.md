ESTÁNDARES FRONTEND:

1. PATRÓN DUMB/SMART: Componentes base (Shadcn UI en /components/ui) son átomos, no les inyectes lógica. Pages/Templates (Smart) manejan el estado y pasan props.

2. TECNOLOGÍAS: Usa solo Tailwind CSS y Shadcn UI.

3. DIRECTIVA CLIENTE: Nunca uses 'use client' a menos que haya interactividad real (hooks, onClick).

4. UX/UI: Cero alertas nativas. Usa modales o Toasts. Agrega data-testid en elementos clave.
