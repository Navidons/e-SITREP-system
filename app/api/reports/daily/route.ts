import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { canAccessStation, can, PERMISSIONS } from "@/lib/rbac";
import {
  getDayRecord,
  ensureDayRecord,
  updateDayRemarks,
  todayDateString,
} from "@/lib/reports/daily-day";
import { parseReportDate } from "@/lib/utils";

export async function GET(request: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? todayDateString();
  const stationIdParam = searchParams.get("stationId");

  const stationId = stationIdParam
    ? Number(stationIdParam)
    : user.stationId;

  if (!stationId || !canAccessStation(user, stationId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const report = await getDayRecord(stationId, date);

  if (!report) {
    const station = await prisma.borderStation.findUnique({
      where: { id: stationId },
    });
    return NextResponse.json({
      reportDate: date,
      status: "draft",
      entries: [],
      entryCount: 0,
      station,
      isToday: date === todayDateString(),
      summary: {
        arrivals: { rows: [], male: 0, female: 0, total: 0 },
        departures: { rows: [], male: 0, female: 0, total: 0 },
        specialCategories: [],
      },
    });
  }

  return NextResponse.json({
    ...report,
    isToday: date === todayDateString(),
  });
}

export async function PATCH(request: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  if (!can(user, PERMISSIONS.STATION_INPUT) || !user.stationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const reportDate = body.reportDate as string;
  if (!reportDate) {
    return NextResponse.json({ error: "reportDate required" }, { status: 400 });
  }

  const report = await ensureDayRecord(
    user.stationId,
    Number(user.id),
    reportDate,
  );

  await updateDayRemarks(report.id, body);
  const full = await getDayRecord(user.stationId, reportDate);
  return NextResponse.json(full);
}
