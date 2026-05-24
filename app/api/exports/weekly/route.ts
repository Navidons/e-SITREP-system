import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-helpers";
import { PERMISSIONS } from "@/lib/rbac";
import { ReportStatus } from "@prisma/client";
import { parseReportDate } from "@/lib/utils";
import {
  buildWeeklyStatisticsWorkbook,
  listDatesInclusive,
  WEEKLY_EXPORT_STATUSES,
} from "@/lib/exports/weekly-matrix";

export async function GET(request: Request) {
  const user = await requirePermission(PERMISSIONS.WEEKLY_EXPORT);
  if (user instanceof NextResponse) return user;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json(
      { error: "from and to dates required (YYYY-MM-DD)" },
      { status: 400 },
    );
  }

  const fromDate = parseReportDate(from);
  const toDate = parseReportDate(to);
  if (fromDate > toDate) {
    return NextResponse.json(
      { error: "from must be on or before to" },
      { status: 400 },
    );
  }

  const dates = listDatesInclusive(from, to);
  if (dates.length > 31) {
    return NextResponse.json(
      { error: "Date range cannot exceed 31 days" },
      { status: 400 },
    );
  }

  const stations = await prisma.borderStation.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });

  const reports = await prisma.stationDailyReport.findMany({
    where: {
      reportDate: { gte: fromDate, lte: toDate },
      status: { in: WEEKLY_EXPORT_STATUSES },
    },
    select: {
      stationId: true,
      reportDate: true,
      entries: {
        select: { entryType: true, male: true, female: true },
      },
    },
  });

  const workbook = await buildWeeklyStatisticsWorkbook({
    from,
    to,
    stations,
    reports,
    sheetTitle: "Weekly Statistics",
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `WEEKLY STATISTICS ${from} to ${to}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
