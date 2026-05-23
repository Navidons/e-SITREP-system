import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { canAccessStation } from "@/lib/rbac";
import { PERMISSIONS } from "@/lib/rbac";
import { can } from "@/lib/rbac";
import type { DailyReportPayload } from "@/types/reports";
import { upsertDailyReport, reportInclude } from "@/lib/reports/report-service";
import { parseReportDate } from "@/lib/utils";
import { ReportStatus } from "@prisma/client";

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

  const report = await prisma.stationDailyReport.findUnique({
    where: {
      stationId_reportDate: {
        stationId,
        reportDate: parseReportDate(date),
      },
    },
    include: reportInclude,
  });

  return NextResponse.json(report);
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  if (!can(user, PERMISSIONS.STATION_INPUT)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!user.stationId) {
    return NextResponse.json(
      { error: "No station assigned to user" },
      { status: 400 },
    );
  }

  const body = (await request.json()) as DailyReportPayload;
  const report = await upsertDailyReport(
    user.stationId,
    user.id,
    body,
    ReportStatus.draft,
  );
  return NextResponse.json(report);
}

export async function PATCH(request: Request) {
  return POST(request);
}
