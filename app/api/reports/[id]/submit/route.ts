import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { can, PERMISSIONS, canAccessStation } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { transitionReport } from "@/lib/reports/workflow";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  if (!can(user, PERMISSIONS.STATION_INPUT)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const reportId = Number(id);
  const report = await prisma.stationDailyReport.findUnique({
    where: { id: reportId },
  });
  if (!report) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!canAccessStation(user, report.stationId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await transitionReport(reportId, Number(user.id), "submit");
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.report);
}
