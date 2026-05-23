import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-helpers";
import { PERMISSIONS } from "@/lib/rbac";
import { ReportStatus } from "@prisma/client";
import { reportInclude } from "@/lib/reports/report-service";

export async function GET() {
  const user = await requirePermission(PERMISSIONS.REPORT_REVIEW);
  if (user instanceof NextResponse) return user;

  const reports = await prisma.stationDailyReport.findMany({
    where: {
      status: {
        in: [
          ReportStatus.submitted,
          ReportStatus.reviewed,
          ReportStatus.verified,
        ],
      },
    },
    include: reportInclude,
    orderBy: [{ reportDate: "desc" }, { station: { name: "asc" } }],
  });

  return NextResponse.json(reports);
}
