import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth-helpers";
import { PERMISSIONS } from "@/lib/rbac";
import { listAdminStations, updateAdminStation } from "@/lib/admin/service";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const user = await requirePermission(PERMISSIONS.ADMIN_USERS);
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  const stationId = Number(id);
  if (!Number.isFinite(stationId)) {
    return NextResponse.json({ error: "Invalid station id" }, { status: 400 });
  }

  const body = await request.json();
  const result = await updateAdminStation(stationId, {
    name: body.name,
    cluster: body.cluster,
    type: body.type,
    location: body.location,
    active: body.active,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const stations = await listAdminStations();
  return NextResponse.json({ stations });
}
