---
trigger: always_on
---

ESTÁNDAR ARQUITECTÓNICO ABSOLUTO PARA NEXT.JS (APLICAR SIEMPRE SIN EXCEPCIONES):

1. PATRÓN DUMB/SMART Y ATOMIC DESIGN EN NEXT.JS:
- SHADCN UI (Átomos): Los componentes base de Shadcn (en `/components/ui`) son tus átomos. No los modifiques para meter lógica.
- MOLECULES & ORGANISMS (Dumb): Solo reciben `props` y emiten `callbacks`. 
- DIRECTIVA DE CLIENTE: NUNCA agregues `"use client"` a un componente a menos que tenga interactividad real (onClick, useState, hooks). Si es solo visual, déjalo como Server Component genérico.
- PAGES/TEMPLATES (Smart): Son los ÚNICOS que hacen data fetching, se conectan a la base de datos o manejan estado complejo. Pasan la data limpia hacia abajo.
- PROHIBIDO ALERTAS NATIVAS: Cero `alert()`, `confirm()` o `prompt()`. Usa siempre Modales, Dialogs o Toasts de Shadcn UI para feedback destructivo o confirmaciones.

2. STACK TECNOLÓGICO Y FETCHING:
- Tailwind CSS nativo y Shadcn UI. (Cero librerías externas innecesarias).
- PROHIBIDO Redux/Sagas.
- FETCHING FLOW: Usa React Server Components (RSC) en las Pages para la carga inicial de datos. Usa Server Actions para mutaciones (crear/editar/borrar). Si hay interacciones muy dinámicas en cliente, usa TanStack Query envolviendo esos Server Actions.

3. CLEAN CODE Y VALIDACIÓN (ZOD):
- TypeScript estricto. Prohibido el uso de 'any'. Define siempre las interfaces/types.
- Zod es el único validador perimetral. Absolutamente todo cuerpo de petición, Server Action o formulario debe validarse con un esquema Zod antes de ejecutarse.

4. UX/UI PARA CRMs Y ERPs:
- Prioriza usabilidad en tablas, formularios y navegación de filtros.
- Crea dashboards enfocados en los KPIs del rol del usuario (ej. abogado, administrador), permitiendo drill-through.
- Para acciones destructivas, implementa divulgación progresiva y confirmaciones claras usando la UI.
- Testing E2E: Agrega siempre `data-testid='nombre-del-elemento'` en botones y formularios clave.

5. BACKEND Y SERVER ACTIONS (REGLAS DE ORO):
- DIRECTORIOS: `/src/server/actions` exclusivo para Server Actions. `/src/server/services` para consultas de Prisma. La lógica DB nunca va suelta en las vistas.
- RESPUESTAS ESTANDARIZADAS: Todo Server Action usa try/catch y retorna `{ success: true, data: result }` o `{ success: false, error: 'Mensaje' }`. NUNCA expongas errores crudos de Prisma/SQL al cliente.
- SEGURIDAD Y NEXTAUTH: Toda acción del servidor debe verificar la sesión y el `role` del usuario antes de tocar la BD. Asume seguridad Zero Trust.
- PRISMA: Usa siempre el patrón Singleton para el cliente de Prisma para no agotar conexiones en re-renders.

6. REGLA ESTRICTA DE OPERACIÓN EN TERMINAL Y AHORRO DE TOKENS:
- PROHIBICIÓN DE EJECUCIÓN AUTÓNOMA: Tienes estrictamente prohibido ejecutar por tu cuenta comandos de gestión de paquetes, compilación o base de datos que generen logs extensos. Esto incluye, pero no se limita a: `npm install`, `npm run dev`, `npm run build`, `npx prisma generate` o `npx prisma db push`.
- DELEGACIÓN AL HUMANO: Cuando el desarrollo requiera instalar una nueva dependencia, levantar el entorno o impactar la base de datos, SOLO debes entregarme el comando exacto formateado en un bloque de código bash.
- PAUSA Y ESPERA: Una vez que me des el comando, asume que yo lo ejecutaré manualmente. No intentes adivinar el resultado de la terminal; espera mi confirmación de que la instalación o compilación fue exitosa antes de continuar con el código.

7. REGLAS DE TIEMPO REAL (SSE) Y PREVENCIÓN DE FUGAS DE MEMORIA:
- PREVENCIÓN DE FUGAS DE MEMORIA (MEMORY LEAK): En el custom hook `useNotifications.ts`, DEBES garantizar en el `useEffect` que la conexión `EventSource` se cierre correctamente usando una función de limpieza (cleanup function: `eventSource.close()`) al desmontar el componente. De lo contrario, saturaremos el cliente y el servidor con múltiples conexiones abiertas.
- ADVERTENCIA SERVERLESS (ESCALABILIDAD): Ten en cuenta que el Singleton de `EventEmitter` en memoria solo funcionará en un entorno Node.js tradicional. Si llegamos a desplegar en Vercel o en un entorno Serverless, las funciones efímeras no compartirán memoria. Por ahora, procede con el `EventEmitter`, pero añade un comentario de advertencia claro (`// TODO`) en el archivo `notification-emitter.ts` indicando que para escalar a Serverless se requerirá Redis (Pub/Sub) o un servicio externo.

8. REGLAS DE ENTORNOS (DESARROLLO VS PRODUCCIÓN) Y BASE DE DATOS:
- SEPARACIÓN ESTRICTA DE ENTORNOS: A partir de ahora, trabajaremos con dos entornos de base de datos distintos:
  * DESARROLLO (Local): Una base de datos MySQL corriendo en mi computadora local (localhost).
  * PRODUCCIÓN (Hostinger): La base de datos MySQL remota.
- MANTENER EL PROVIDER: En el archivo `schema.prisma`, el provider SIEMPRE debe ser 'mysql'. No lo cambies a SQLite.
- FLUJO DE TRABAJO PREDETERMINADO (LOCAL):
  * Asume SIEMPRE que estamos trabajando en el entorno de DESARROLLO. 
  * Cualquier comando de Prisma que me sugieras (ej. 'npx prisma migrate dev' o 'npx prisma db push') está destinado ÚNICAMENTE a la base de datos local.
  * No debes preocuparte por los límites de conexión en esta etapa.
- PROTOCOLO DE PASE A PRODUCCIÓN:
  * Tienes ESTRICTAMENTE PROHIBIDO sugerirme que ejecute comandos hacia la base de datos de Hostinger durante el desarrollo normal.
  * Únicamente cuando yo te escriba la frase exacta 'INICIAR PASE A PRODUCCIÓN', entenderás que el código y la base de datos local están probados y aprobados.
  * En ese momento, me darás los pasos y comandos exactos (ej. 'npx prisma migrate deploy' o 'npx prisma db push') advirtiéndome que debo cambiar mi archivo .env para apuntar a Hostinger temporalmente para aplicar los cambios de esquema.

9. CENTRALIZACIÓN DE CONSTANTES Y DICCIONARIOS:
- PROHIBIDO MAGIC STRINGS: Los diccionarios de mapeo (ej. `statusLabels`, `paymentStatusColors`), listas estáticas de opciones, y constantes de configuración nunca deben vivir directamente dentro de los componentes o páginas (`page.tsx`).
- CARPETA DESIGNADA: Toda constante o mapeo de datos que pueda ser reutilizado debe centralizarse en un directorio dedicado, típicamente en `/src/lib/constants.ts` (o `/src/constants/`).
- IMPORTACIÓN LIMPIA: Las páginas y componentes solo deben importar estos diccionarios, manteniendo la declaración de variables lo más limpia posible y asegurando una única fuente de verdad para toda la aplicación.

INSTRUCCIÓN OPERATIVA CONSTANTE:
Cuando solicite un nuevo módulo o pantalla, NO preguntes qué tecnologías usar. Diseña la solución aplicando estas reglas, separa los componentes presentacionales de los contenedores, y entrégame el código final listo para integrar.