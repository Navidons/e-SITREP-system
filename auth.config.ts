import type { NextAuthConfig } from "next-auth";

/** Edge-safe auth config (no Prisma). */
export const authConfig = {
  trustHost: true,
  providers: [],
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
} satisfies NextAuthConfig;
