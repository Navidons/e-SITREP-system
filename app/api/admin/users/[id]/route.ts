import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth-helpers";
import { PERMISSIONS } from "@/lib/rbac";
import { listAdminUsers, updateAdminUser, deleteAdminUser } from "@/lib/admin/service";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const user = await requirePermission(PERMISSIONS.ADMIN_USERS);
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  const userId = Number(id);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  const body = await request.json();

  const result = await updateAdminUser(userId, {
    fullName: body.fullName,
    email: body.email,
    password: body.password || undefined,
    stationId:
      body.stationId === null || body.stationId === ""
        ? null
        : body.stationId !== undefined
          ? Number(body.stationId)
          : undefined,
    roleNames: Array.isArray(body.roleNames) ? body.roleNames : undefined,
    isActive: body.isActive,
    assignedById: Number(user.id),
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const users = await listAdminUsers();
  return NextResponse.json({ users });
}

export async function DELETE(request: Request, { params }: Params) {
  const user = await requirePermission(PERMISSIONS.ADMIN_USERS);
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  const userId = Number(id);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  const result = await deleteAdminUser(userId);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const users = await listAdminUsers();
  return NextResponse.json({ users });
}
