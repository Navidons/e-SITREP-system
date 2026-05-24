import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth-helpers";
import { PERMISSIONS } from "@/lib/rbac";
import { createAdminStation, listAdminStations } from "@/lib/admin/service";

export async function GET() {
  const user = await requirePermission(PERMISSIONS.ADMIN_USERS);
  if (user instanceof NextResponse) return user;

  const stations = await listAdminStations();
  return NextResponse.json({ stations });
}

export async function POST(request: Request) {
  const user = await requirePermission(PERMISSIONS.ADMIN_USERS);
  if (user instanceof NextResponse) return user;

  const body = await request.json();
  const result = await createAdminStation({
    code: body.code ?? "",
    name: body.name ?? "",
    cluster: body.cluster,
    type: body.type,
    location: body.location,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const stations = await listAdminStations();
  return NextResponse.json({ stationId: result.stationId, stations });
}
