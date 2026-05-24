import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { can, PERMISSIONS } from "@/lib/rbac";
import { addDayIncident, getDayRecordForUser } from "@/lib/reports/daily-day";
import type { IncidentPayload } from "@/types/reports";

export async function POST(request: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  if (!can(user, PERMISSIONS.STATION_INPUT) || !user.stationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as IncidentPayload;
  const result = await addDayIncident({
    stationId: user.stationId,
    userId: Number(user.id),
    reportDate: body.reportDate,
    incidentType: body.incidentType,
    description: body.description,
    passportNo: body.passportNo,
    personName: body.personName,
    actionTaken: body.actionTaken,
  });

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
