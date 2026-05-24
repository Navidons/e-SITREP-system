import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { can, PERMISSIONS } from "@/lib/rbac";
import { deleteDayEntry, getDayRecord } from "@/lib/reports/daily-day";

type Params = { params: Promise<{ entryId: string }> };

export async function DELETE(request: Request, { params }: Params) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  if (!can(user, PERMISSIONS.STATION_INPUT) || !user.stationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "date required" }, { status: 400 });
  }

  const { entryId } = await params;
  const result = await deleteDayEntry({
    stationId: user.stationId,
    userId: Number(user.id),
    reportDate: date,
    entryId: Number(entryId),
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const full = await getDayRecord(user.stationId, date);
  return NextResponse.json(full);
}
