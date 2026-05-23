import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-helpers";
import { PERMISSIONS } from "@/lib/rbac";
import { ReportStatus } from "@prisma/client";
import { parseReportDate } from "@/lib/utils";
import {
  formatStationConsolidated,
} from "@/lib/reports/consolidated-formatter";
import { reportToConsolidatedInput } from "@/lib/reports/report-service";
import { reportInclude } from "@/lib/reports/report-service";

export async function POST(request: Request) {
  const user = await requirePermission(
    PERMISSIONS.REPORT_GENERATE_CONSOLIDATED,
  );
  if (user instanceof NextResponse) return user;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "date is required" }, { status: 400 });
  }

  const reports = await prisma.stationDailyReport.findMany({
    where: {
      reportDate: parseReportDate(date),
      status: ReportStatus.approved,
    },
    include: reportInclude,
    orderBy: { station: { name: "asc" } },
  });

  const stations = reports.map((r) =>
    formatStationConsolidated(reportToConsolidatedInput(r)),
  );

  const consolidated = [
    `CONSOLIDATED DAILY SITREP — ${date}`,
    `Stations: ${reports.length}`,
    "",
    ...stations.flatMap((s) => [s, ""]),
  ].join("\n");

  return NextResponse.json({
    date,
    stationCount: reports.length,
    consolidated,
    stations: reports.map((r) => ({
      id: r.id,
      station: r.station.name,
      code: r.station.code,
      text: formatStationConsolidated(reportToConsolidatedInput(r)),
    })),
  });
}
