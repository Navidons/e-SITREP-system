import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { rejectAmendment } from "@/lib/reports/amendments";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const result = await rejectAmendment(
    Number(id),
    Number(user.id),
    user,
    body.comment,
  );

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, message: "Correction request rejected." });
}
