import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { can, isSystemAdmin, PERMISSIONS } from "@/lib/rbac";
import { requestDeleteEntryAmendment } from "@/lib/reports/amendments";
import {
  deleteDayEntry,
  getDayRecordForUser,
  updateDayEntry,
} from "@/lib/reports/daily-day";
import type { DayEntryUpdatePayload } from "@/types/reports";

type Params = { params: Promise<{ entryId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  if (!can(user, PERMISSIONS.STATION_INPUT) || !user.stationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { entryId } = await params;
  const body = (await request.json()) as DayEntryUpdatePayload;

  const result = await updateDayEntry({
    stationId: user.stationId,
    userId: Number(user.id),
    reportDate: body.reportDate,
    entryId: Number(entryId),
    entry: {
      entryType: body.entryType,
      nationalityCode: body.nationalityCode,
      male: body.male ?? 0,
      female: body.female ?? 0,
      flightNumber: body.flightNumber,
      route: body.route,
      shift: body.shift,
      passportNo: body.passportNo,
      personName: body.personName,
      recordedAt: body.recordedAt,
      notes: body.notes,
    },
    correctionReason: body.correctionReason,
    user,
  });

  if ("requiresAmendment" in result && result.requiresAmendment) {
    return NextResponse.json(
      { error: result.error, requiresAmendment: true },
      { status: result.status },
    );
  }

  if ("amendment" in result) {
    const report = await getDayRecordForUser(
      user.stationId,
      body.reportDate,
      Number(user.id),
    );
    return NextResponse.json({
      ...report,
      amendmentQueued: true,
      message:
        "Update submitted for HQ approval. Totals reconcile after approval.",
    });
  }

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const report = await getDayRecordForUser(
    user.stationId,
    body.reportDate,
    Number(user.id),
  );
  return NextResponse.json({
    ...report,
    message: "Entry updated. Day totals reconciled.",
  });
}

export async function DELETE(request: Request, { params }: Params) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;
  if (!can(user, PERMISSIONS.STATION_INPUT) || !user.stationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const correctionReason = searchParams.get("correctionReason");
  if (!date) {
    return NextResponse.json({ error: "date required" }, { status: 400 });
  }

  const { entryId } = await params;
  const admin = isSystemAdmin(user);

  const result = await deleteDayEntry({
    stationId: user.stationId,
    userId: Number(user.id),
    reportDate: date,
    entryId: Number(entryId),
    bypassLock: admin,
  });

  if ("locked" in result && result.locked) {
    if (!correctionReason?.trim()) {
      return NextResponse.json(
        {
          error: result.error,
          requiresAmendment: true,
        },
        { status: result.status },
      );
    }
    const amendment = await requestDeleteEntryAmendment({
      stationId: user.stationId,
      userId: Number(user.id),
      reportDate: date,
      entryId: Number(entryId),
      reason: correctionReason,
    });
    if ("error" in amendment) {
      return NextResponse.json(
        { error: amendment.error },
        { status: amendment.status },
      );
    }
    const full = await getDayRecordForUser(
      user.stationId,
      date,
      Number(user.id),
    );
    return NextResponse.json({
      ...full,
      amendmentQueued: true,
      message: "Removal request sent for HQ approval.",
    });
  }

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const full = await getDayRecordForUser(
    user.stationId,
    date,
    Number(user.id),
  );
  return NextResponse.json(full);
}
