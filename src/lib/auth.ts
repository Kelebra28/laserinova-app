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
  const tokenCookie = 
    cookieStore.get("next-auth.session-token") || 
    cookieStore.get("__Secure-next-auth.session-token");
  
  if (!tokenCookie?.value) {
    throw new Error("No se pudo obtener la sesión de usuario en el servidor (Posible fallo de cookies o caché).");
  }
  
  const decoded = await decode({
    token: tokenCookie.value,
    secret: process.env.NEXTAUTH_SECRET as string,
  });
  
  if (!decoded || !decoded.id) {
    throw new Error("Token de sesión inválido o expirado.");
  }
  
  return decoded as any;
}
