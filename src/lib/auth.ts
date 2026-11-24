import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing credentials");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.active) {
          throw new Error("User not found or inactive");
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isValidPassword) {
          throw new Error("Invalid password");
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          permissions: user.permissions,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // Sesión dura 30 días para evitar desconexiones molestas.
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.permissions = (user as any).permissions;
      }
      // Se elimina el findUnique aquí para evitar DDoSear la base de datos en Hostinger.
      // Los permisos se leen del token de forma ultra-rápida.
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).permissions = token.permissions;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

export async function requireAuth() {
  const { cookies } = await import("next/headers");
  const { decode } = await import("next-auth/jwt");
  
  const cookieStore = await cookies();
  // Vercel usa __Secure- en producción, localhost/HTTP usa el prefijo normal
  const candidates = [
    cookieStore.get("next-auth.session-token"),
    cookieStore.get("__Secure-next-auth.session-token"),
  ].filter((c): c is { name: string; value: string } => !!c?.value);

  if (candidates.length === 0) {
    throw new Error("No se pudo obtener la sesión de usuario en el servidor (Posible fallo de cookies o caché).");
  }

  // Puede haber dos cookies de sesión (por ejemplo una vieja de otro proyecto en localhost): se usa la primera
  // que descifre con nuestra clave. La firma se sigue verificando igual; solo no se queda con la primera que falle.
  let decoded: Awaited<ReturnType<typeof decode>> = null;
  for (const cookie of candidates) {
    try {
      decoded = await decode({ token: cookie.value, secret: process.env.NEXTAUTH_SECRET as string });
      if (decoded) break;
    } catch {
      // cookie de otra clave o dañada: se prueba la siguiente
    }
  }
  
  if (!decoded || !decoded.id) {
    throw new Error("Token de sesión inválido o expirado.");
  }
  
  return decoded as any;
}
