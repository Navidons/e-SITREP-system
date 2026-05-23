import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { can, type PermissionName, type SessionUser } from "@/lib/rbac";

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  return session?.user ?? null;
}

export async function requireUser(): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return user;
}

export async function requirePermission(
  permission: PermissionName,
): Promise<SessionUser | NextResponse> {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  if (!can(user, permission)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return user;
}
