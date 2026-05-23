import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth-helpers";
import { PERMISSIONS } from "@/lib/rbac";
import { transitionReport } from "@/lib/reports/workflow";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const user = await requirePermission(PERMISSIONS.REPORT_VERIFY);
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const result = await transitionReport(
    Number(id),
    user.id,
    "verify",
    body.comment,
  );
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.report);
}
