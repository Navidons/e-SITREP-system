import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { can, canAccessStation, isHqUser, PERMISSIONS } from "@/lib/rbac";
import { getReportDetailById } from "@/lib/reports/daily-day";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  const reportId = Number(id);
  if (!Number.isFinite(reportId)) {
    return NextResponse.json({ error: "Invalid report id" }, { status: 400 });
  }

  const detail = await getReportDetailById(reportId, Number(user.id));
  if (!detail) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const canReview =
    isHqUser(user) ||
    can(user, PERMISSIONS.REPORT_REVIEW) ||
    can(user, PERMISSIONS.ADMIN_USERS);

  if (!canReview && !canAccessStation(user, detail.station.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(detail);
}
