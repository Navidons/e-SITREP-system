import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { can, PERMISSIONS } from "@/lib/rbac";
import { addDayEntry, getDayRecord } from "@/lib/reports/daily-day";
import type { DayEntryPayload } from "@/types/reports";

export async function POST(request: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  if (!can(user, PERMISSIONS.STATION_INPUT) || !user.stationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as DayEntryPayload;

  const result = await addDayEntry({
    stationId: user.stationId,
    userId: Number(user.id),
    reportDate: body.reportDate,
    entryType: body.entryType,
    nationalityCode: body.nationalityCode,
    male: body.male ?? 0,
    female: body.female ?? 0,
    recordedAt: body.recordedAt,
    notes: body.notes,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const report = await getDayRecord(user.stationId, body.reportDate);
  return NextResponse.json(report);
}
