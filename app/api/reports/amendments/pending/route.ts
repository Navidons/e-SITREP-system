import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { can, PERMISSIONS } from "@/lib/rbac";
import {
  describeAmendment,
  listPendingAmendments,
} from "@/lib/reports/amendments";
import type { AmendmentAction } from "@prisma/client";

export async function GET() {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  if (
    !can(user, PERMISSIONS.REPORT_REVIEW) &&
    !can(user, PERMISSIONS.REPORT_VERIFY) &&
    !can(user, PERMISSIONS.REPORT_APPROVE)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await listPendingAmendments();
  return NextResponse.json(
    rows.map((a) => ({
      id: a.id,
      action: a.action,
      summary: describeAmendment(a.action as AmendmentAction, a.payload),
      reason: a.reason,
      createdAt: a.createdAt.toISOString(),
      reportId: a.reportId,
      reportStatus: a.report.status,
      reportDate: a.report.reportDate.toISOString().slice(0, 10),
      station: a.report.station,
      requestedBy: a.requestedBy,
    })),
  );
}
