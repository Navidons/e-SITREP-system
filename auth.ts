import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";
import type { SessionUser } from "@/lib/rbac";

async function loadUserPermissions(userId: number) {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          rolePermissions: { include: { permission: true } },
        },
      },
    },
  });

  const roles = userRoles.map((ur) => ur.role.name);
  const permissions = new Set<string>();
  for (const ur of userRoles) {
    for (const rp of ur.role.rolePermissions) {
      permissions.add(rp.permission.name);
    }
  }
  return { roles, permissions: [...permissions] };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const username = credentials?.username as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!username || !password) return null;

        const user = await prisma.user.findUnique({
          where: { username },
        });
        if (!user || !user.isActive) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        const { roles, permissions } = await loadUserPermissions(user.id);

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        });

        return {
          id: String(user.id),
          username: user.username,
          fullName: user.fullName,
          stationId: user.stationId,
          roles,
          permissions,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as SessionUser;
        token.id = u.id;
        token.username = u.username;
        token.fullName = u.fullName;
        token.stationId = u.stationId;
        token.roles = u.roles;
        token.permissions = u.permissions;
      }
      return token;
    },
    async session({ session, token }) {
      const user: SessionUser = {
        id: token.id as string,
        username: token.username as string,
        fullName: token.fullName as string,
        stationId: token.stationId as number | null,
        roles: token.roles as string[],
        permissions: token.permissions as string[],
      };
      session.user = user as typeof session.user;
      return session;
    },
  },
});
