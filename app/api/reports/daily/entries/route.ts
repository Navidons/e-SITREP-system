import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { can, isSystemAdmin, PERMISSIONS } from "@/lib/rbac";
import { requestAddEntryAmendment } from "@/lib/reports/amendments";
import { addDayEntry, getDayRecordForUser } from "@/lib/reports/daily-day";
import type { DayEntryPayload } from "@/types/reports";

export async function POST(request: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  if (!can(user, PERMISSIONS.STATION_INPUT) || !user.stationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as DayEntryPayload;
  const admin = isSystemAdmin(user);

  const result = await addDayEntry({
    stationId: user.stationId,
    userId: Number(user.id),
    reportDate: body.reportDate,
    entryType: body.entryType,
    nationalityCode: body.nationalityCode,
    male: body.male ?? 0,
    female: body.female ?? 0,
    flightNumber: body.flightNumber,
    route: body.route,
    shift: body.shift,
    passportNo: body.passportNo,
    personName: body.personName,
    recordedAt: body.recordedAt,
    notes: body.notes,
    bypassLock: admin,
  });

  if ("locked" in result && result.locked) {
    return NextResponse.json(
      {
        error: result.error,
        requiresAmendment: false,
        adminOnly: true,
      },
      { status: result.status },
    );
  }

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const report = await getDayRecordForUser(
    user.stationId,
    body.reportDate,
    Number(user.id),
  );
  return NextResponse.json(report);
}
