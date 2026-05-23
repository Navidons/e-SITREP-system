import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { can, PERMISSIONS, canAccessStation } from "@/lib/rbac";
import { deleteDayEntry, getDailyReportWithSummary } from "@/lib/reports/entry-service";
import { prisma } from "@/lib/prisma";
import { parseReportDate } from "@/lib/utils";

type Params = { params: Promise<{ entryId: string }> };

export async function DELETE(request: Request, { params }: Params) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  if (!can(user, PERMISSIONS.STATION_INPUT) || !user.stationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind");
  const date = searchParams.get("date");
  if (kind !== "movement" && kind !== "special") {
    return NextResponse.json({ error: "kind=movement|special required" }, { status: 400 });
  }
  if (!date) {
    return NextResponse.json({ error: "date required" }, { status: 400 });
  }

  const report = await prisma.stationDailyReport.findUnique({
    where: {
      stationId_reportDate: {
        stationId: user.stationId,
        reportDate: parseReportDate(date),
      },
    },
  });
  if (!report || !canAccessStation(user, report.stationId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { entryId } = await params;
  const result = await deleteDayEntry({
    reportId: report.id,
    entryId: Number(entryId),
    kind,
    userId: Number(user.id),
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const full = await getDailyReportWithSummary(user.stationId, date);
  return NextResponse.json(full);
}
