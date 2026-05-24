import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { canAccessStation, can, PERMISSIONS } from "@/lib/rbac";
import {
  getDayRecordForUser,
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

  const report = await getDayRecordForUser(
    stationId,
    date,
    Number(user.id),
  );

  if (!report) {
    const station = await prisma.borderStation.findUnique({
      where: { id: stationId },
    });
    return NextResponse.json({
      reportDate: date,
      status: "draft",
      entries: [],
      incidents: [],
      entryCount: 0,
      inadmissibleCount: 0,
      station,
      isToday: date === todayDateString(),
      summary: {
        arrivals: { rows: [], male: 0, female: 0, total: 0 },
        departures: { rows: [], male: 0, female: 0, total: 0 },
        specialCategories: [],
        air: {
          flightArrivals: { flights: 0, passengers: 0 },
          flightDepartures: { flights: 0, passengers: 0 },
          deportees: 0,
          returned: 0,
          offloaded: 0,
          denied: 0,
        },
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

  await updateDayRemarks(report.id, {
    staffOnDuty: body.staffOnDuty,
    medicalScreening: body.medicalScreening,
    generalRemarks: body.generalRemarks,
    urgentMatters: body.urgentMatters,
    inadmissibleCount: body.inadmissibleCount,
    staffLeaveNotes: body.staffLeaveNotes,
  });
  const full = await getDayRecordForUser(
    user.stationId,
    reportDate,
    Number(user.id),
  );
  return NextResponse.json(full);
}
