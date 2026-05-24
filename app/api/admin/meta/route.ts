import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth-helpers";
import { PERMISSIONS } from "@/lib/rbac";
import { ASSIGNABLE_ROLES } from "@/lib/admin/navigation";
import {
  listRoleOptions,
  listStationOptions,
} from "@/lib/admin/service";

export async function GET() {
  const user = await requirePermission(PERMISSIONS.ADMIN_USERS);
  if (user instanceof NextResponse) return user;

  const [roles, stations] = await Promise.all([
    listRoleOptions(),
    listStationOptions(),
  ]);

  return NextResponse.json({
    assignableRoles: ASSIGNABLE_ROLES,
    roles,
    stations,
  });
}
