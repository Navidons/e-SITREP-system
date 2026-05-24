import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth-helpers";
import { PERMISSIONS } from "@/lib/rbac";
import { createAdminUser, listAdminUsers } from "@/lib/admin/service";

export async function GET() {
  const user = await requirePermission(PERMISSIONS.ADMIN_USERS);
  if (user instanceof NextResponse) return user;

  const users = await listAdminUsers();
  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const user = await requirePermission(PERMISSIONS.ADMIN_USERS);
  if (user instanceof NextResponse) return user;

  const body = await request.json();
  const result = await createAdminUser({
    username: body.username ?? "",
    fullName: body.fullName ?? "",
    email: body.email,
    password: body.password ?? "",
    stationId: body.stationId ? Number(body.stationId) : null,
    roleNames: Array.isArray(body.roleNames) ? body.roleNames : [],
    assignedById: Number(user.id),
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const users = await listAdminUsers();
  return NextResponse.json({ userId: result.userId, users });
}
