import type { NextAuthConfig } from "next-auth";

/** Edge-safe auth config (no Prisma). */
export const authConfig = {
  trustHost: process.env.NODE_ENV !== "production",
  providers: [],
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
} satisfies NextAuthConfig;
