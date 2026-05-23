import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { canAccessStation, can, PERMISSIONS } from "@/lib/rbac";
import { getDailyReportWithSummary, ensureDailyReport } from "@/lib/reports/entry-service";
import { updateReportRemarks } from "@/lib/reports/report-service";
import { parseReportDate } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const stationIdParam = searchParams.get("stationId");

  if (!date) {
    return NextResponse.json({ error: "date is required" }, { status: 400 });
  }

  const stationId = stationIdParam
    ? Number(stationIdParam)
    : user.stationId;

  if (!stationId || !canAccessStation(user, stationId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const report = await getDailyReportWithSummary(stationId, date);

  if (!report) {
    const station = await prisma.borderStation.findUnique({
      where: { id: stationId },
    });
    return NextResponse.json({
      reportDate: date,
      status: "draft",
      movements: [],
      specialCategories: [],
      station,
      summary: {
        arrivals: { rows: [], male: 0, female: 0, total: 0 },
        departures: { rows: [], male: 0, female: 0, total: 0 },
        specialCategories: [],
      },
    });
  }

  return NextResponse.json(report);
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

  const report = await ensureDailyReport(
    user.stationId,
    Number(user.id),
    reportDate,
  );

  const updated = await updateReportRemarks(report.id, body);
  const full = await getDailyReportWithSummary(user.stationId, reportDate);
  return NextResponse.json(full ?? updated);
}
