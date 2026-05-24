import { prisma } from "@/lib/prisma";
import {
  AmendmentAction,
  AmendmentStatus,
  DailyEntryType,
  ReportStatus,
} from "@prisma/client";
import { logAudit } from "@/lib/audit";
import {
  ensureCountriesLoaded,
  resolveCountry,
} from "@/lib/countries/service";
import { normalizeCountryCodeForStorage } from "@/lib/countries/storage";
import type { EntryTypeInput } from "@/lib/reports/daily-day";
import {
  normalizeEntryPayload,
  validateEntryInput,
  type EntryInputShape,
} from "@/lib/station/validate-entry";
import { entryNeedsNationality } from "@/lib/station/entry-config";
import { parseReportDate } from "@/lib/utils";
import type { SessionUser } from "@/lib/rbac";
import { can, PERMISSIONS } from "@/lib/rbac";

const LOCKED_FOR_AMENDMENT: ReportStatus[] = [
  ReportStatus.submitted,
  ReportStatus.reviewed,
  ReportStatus.verified,
  ReportStatus.approved,
];

export function reportIsLocked(status: ReportStatus): boolean {
  return LOCKED_FOR_AMENDMENT.includes(status);
}

export function canReviewAmendment(
  user: SessionUser,
  reportStatus: ReportStatus,
): boolean {
  if (can(user, PERMISSIONS.ADMIN_USERS)) return true;
  if (reportStatus === ReportStatus.approved) {
    return can(user, PERMISSIONS.REPORT_APPROVE);
  }
  if (reportStatus === ReportStatus.verified) {
    return (
      can(user, PERMISSIONS.REPORT_APPROVE) ||
      can(user, PERMISSIONS.REPORT_VERIFY)
    );
  }
  return (
    can(user, PERMISSIONS.REPORT_REVIEW) ||
    can(user, PERMISSIONS.REPORT_VERIFY) ||
    can(user, PERMISSIONS.REPORT_APPROVE)
  );
}

export type AddEntryAmendmentPayload = {
  entryType: EntryTypeInput;
  nationalityCode?: string;
  male: number;
  female: number;
  flightNumber?: string;
  route?: string;
  shift?: string;
  passportNo?: string;
  personName?: string;
  recordedAt?: string;
  notes?: string;
};

export type UpdateEntryAmendmentPayload = AddEntryAmendmentPayload & {
  entryId: number;
};

async function validateAddPayload(payload: AddEntryAmendmentPayload) {
  const shape: EntryInputShape = {
    entryType: payload.entryType,
    nationalityCode: payload.nationalityCode,
    male: payload.male,
    female: payload.female,
    flightNumber: payload.flightNumber,
    route: payload.route,
    shift: payload.shift,
    passportNo: payload.passportNo,
    personName: payload.personName,
    notes: payload.notes,
  };
  const validation = validateEntryInput(shape);
  if ("error" in validation) {
    return { error: validation.error, status: 400 as const };
  }
  const normalized = normalizeEntryPayload(shape);
  if (
    !normalized.nationalityCode &&
    entryNeedsNationality(payload.entryType as DailyEntryType)
  ) {
    return { error: "Nationality is required", status: 400 as const };
  }
  if (!normalized.nationalityCode) {
    return { normalized };
  }
  await ensureCountriesLoaded();
  const nationalityCode = normalizeCountryCodeForStorage(normalized.nationalityCode);
  if (
    !resolveCountry(normalized.nationalityCode) &&
    !resolveCountry(nationalityCode)
  ) {
    return { error: "Unknown country code", status: 400 as const };
  }
  return { normalized: { ...normalized, nationalityCode } };
}

export async function requestAddEntryAmendment(params: {
  stationId: number;
  userId: number;
  reportDate: string;
  reason: string;
  entry: AddEntryAmendmentPayload;
}) {
  const report = await prisma.stationDailyReport.findUnique({
    where: {
      stationId_reportDate: {
        stationId: params.stationId,
        reportDate: parseReportDate(params.reportDate),
      },
    },
  });
  if (!report) return { error: "Day record not found", status: 404 as const };
  if (!reportIsLocked(report.status)) {
    return { error: "Day is not locked; save directly", status: 400 as const };
  }
  if (!params.reason.trim()) {
    return { error: "Correction reason is required", status: 400 as const };
  }

  const validated = await validateAddPayload(params.entry);
  if ("error" in validated) return validated;

  const n = validated.normalized;
  const payload: AddEntryAmendmentPayload = {
    ...params.entry,
    entryType: params.entry.entryType,
    male: n.male,
    female: n.female,
    nationalityCode: n.nationalityCode ?? undefined,
    flightNumber: n.flightNumber ?? undefined,
    route: n.route ?? undefined,
    shift: n.shift ?? undefined,
    passportNo: n.passportNo ?? undefined,
    personName: n.personName ?? undefined,
    notes: n.notes ?? undefined,
  };

  const amendment = await prisma.dayAmendment.create({
    data: {
      reportId: report.id,
      action: AmendmentAction.add_entry,
      payload,
      reason: params.reason.trim(),
      requestedById: params.userId,
    },
  });

  await logAudit({
    userId: params.userId,
    action: "AMENDMENT_REQUEST",
    entityType: "day_amendment",
    entityId: amendment.id,
    newValues: { action: "add_entry", reportId: report.id, payload },
  });

  return { amendment };
}

export async function requestDeleteEntryAmendment(params: {
  stationId: number;
  userId: number;
  reportDate: string;
  entryId: number;
  reason: string;
}) {
  const report = await prisma.stationDailyReport.findUnique({
    where: {
      stationId_reportDate: {
        stationId: params.stationId,
        reportDate: parseReportDate(params.reportDate),
      },
    },
    include: { entries: { where: { id: params.entryId } } },
  });
  if (!report) return { error: "Day record not found", status: 404 as const };
  if (!reportIsLocked(report.status)) {
    return { error: "Day is not locked; delete directly", status: 400 as const };
  }
  if (!params.reason.trim()) {
    return { error: "Correction reason is required", status: 400 as const };
  }
  if (report.entries.length === 0) {
    return { error: "Entry not found", status: 404 as const };
  }

  const amendment = await prisma.dayAmendment.create({
    data: {
      reportId: report.id,
      action: AmendmentAction.delete_entry,
      payload: { entryId: params.entryId },
      reason: params.reason.trim(),
      targetEntryId: params.entryId,
      requestedById: params.userId,
    },
  });

  await logAudit({
    userId: params.userId,
    action: "AMENDMENT_REQUEST",
    entityType: "day_amendment",
    entityId: amendment.id,
    newValues: { action: "delete_entry", entryId: params.entryId },
  });

  return { amendment };
}

export async function listPendingAmendments() {
  return prisma.dayAmendment.findMany({
    where: { status: AmendmentStatus.pending },
    orderBy: { createdAt: "asc" },
    include: {
      report: { include: { station: true } },
      requestedBy: { select: { fullName: true, username: true } },
    },
  });
}

export async function listReportAmendments(reportId: number) {
  return prisma.dayAmendment.findMany({
    where: { reportId },
    orderBy: { createdAt: "desc" },
    include: {
      requestedBy: { select: { fullName: true } },
      reviewedBy: { select: { fullName: true } },
    },
  });
}

async function applyAddEntry(
  reportId: number,
  userId: number,
  payload: AddEntryAmendmentPayload,
) {
  await prisma.dailyEntry.create({
    data: {
      reportId,
      entryType: payload.entryType as DailyEntryType,
      nationalityCode: payload.nationalityCode ?? null,
      male: payload.male,
      female: payload.female,
      flightNumber: payload.flightNumber ?? null,
      route: payload.route ?? null,
      shift: payload.shift ?? null,
      passportNo: payload.passportNo ?? null,
      personName: payload.personName ?? null,
      recordedAt: payload.recordedAt
        ? new Date(payload.recordedAt)
        : new Date(),
      enteredById: userId,
      notes: payload.notes
        ? `[Correction] ${payload.notes}`
        : "[Correction]",
    },
  });
}

async function applyDeleteEntry(reportId: number, entryId: number) {
  await prisma.dailyEntry.deleteMany({
    where: { id: entryId, reportId },
  });
}

async function applyUpdateEntry(
  entryId: number,
  payload: UpdateEntryAmendmentPayload,
) {
  const existing = await prisma.dailyEntry.findUnique({ where: { id: entryId } });
  await prisma.dailyEntry.update({
    where: { id: entryId },
    data: {
      entryType: payload.entryType as DailyEntryType,
      nationalityCode: payload.nationalityCode ?? null,
      male: payload.male,
      female: payload.female,
      flightNumber: payload.flightNumber ?? null,
      route: payload.route ?? null,
      shift: payload.shift ?? null,
      passportNo: payload.passportNo ?? null,
      personName: payload.personName ?? null,
      recordedAt: payload.recordedAt
        ? new Date(payload.recordedAt)
        : existing?.recordedAt,
      notes: payload.notes ?? existing?.notes ?? null,
    },
  });
}

export async function requestUpdateEntryAmendment(params: {
  stationId: number;
  userId: number;
  reportDate: string;
  entryId: number;
  reason: string;
  entry: AddEntryAmendmentPayload;
}) {
  const report = await prisma.stationDailyReport.findUnique({
    where: {
      stationId_reportDate: {
        stationId: params.stationId,
        reportDate: parseReportDate(params.reportDate),
      },
    },
    include: { entries: { where: { id: params.entryId } } },
  });
  if (!report) return { error: "Day record not found", status: 404 as const };
  if (!reportIsLocked(report.status)) {
    return { error: "Day is not locked; update directly", status: 400 as const };
  }
  if (!params.reason.trim()) {
    return { error: "Correction reason is required", status: 400 as const };
  }
  if (report.entries.length === 0) {
    return { error: "Entry not found", status: 404 as const };
  }

  const validated = await validateAddPayload({
    ...params.entry,
    entryType: params.entry.entryType,
  });
  if ("error" in validated) return validated;

  const n = validated.normalized;
  const payload: UpdateEntryAmendmentPayload = {
    ...params.entry,
    entryId: params.entryId,
    entryType: params.entry.entryType,
    male: n.male,
    female: n.female,
    nationalityCode: n.nationalityCode ?? undefined,
    flightNumber: n.flightNumber ?? undefined,
    route: n.route ?? undefined,
    shift: n.shift ?? undefined,
    passportNo: n.passportNo ?? undefined,
    personName: n.personName ?? undefined,
    notes: n.notes ?? undefined,
  };

  const amendment = await prisma.dayAmendment.create({
    data: {
      reportId: report.id,
      action: AmendmentAction.update_entry,
      payload,
      reason: params.reason.trim(),
      targetEntryId: params.entryId,
      requestedById: params.userId,
    },
  });

  await logAudit({
    userId: params.userId,
    action: "AMENDMENT_REQUEST",
    entityType: "day_amendment",
    entityId: amendment.id,
    newValues: { action: "update_entry", entryId: params.entryId, payload },
  });

  return { amendment };
}

export async function approveAmendment(
  amendmentId: number,
  reviewerId: number,
  user: SessionUser,
  comment?: string,
) {
  const amendment = await prisma.dayAmendment.findUnique({
    where: { id: amendmentId },
    include: { report: true },
  });
  if (!amendment) return { error: "Amendment not found", status: 404 as const };
  if (amendment.status !== AmendmentStatus.pending) {
    return { error: "Amendment already resolved", status: 400 as const };
  }
  if (!canReviewAmendment(user, amendment.report.status)) {
    return { error: "Not authorized to approve this correction", status: 403 as const };
  }

  if (amendment.action === AmendmentAction.add_entry) {
    await applyAddEntry(
      amendment.reportId,
      amendment.requestedById,
      amendment.payload as AddEntryAmendmentPayload,
    );
  } else if (amendment.action === AmendmentAction.delete_entry) {
    const entryId =
      amendment.targetEntryId ??
      (amendment.payload as { entryId: number }).entryId;
    await applyDeleteEntry(amendment.reportId, entryId);
  } else if (amendment.action === AmendmentAction.update_entry) {
    const payload = amendment.payload as UpdateEntryAmendmentPayload;
    const entryId = amendment.targetEntryId ?? payload.entryId;
    await applyUpdateEntry(entryId, payload);
  }

  await prisma.dayAmendment.update({
    where: { id: amendmentId },
    data: {
      status: AmendmentStatus.approved,
      reviewedById: reviewerId,
      reviewComment: comment?.trim() || null,
      resolvedAt: new Date(),
    },
  });

  await logAudit({
    userId: reviewerId,
    action: "AMENDMENT_APPROVE",
    entityType: "day_amendment",
    entityId: amendmentId,
    newValues: { reportId: amendment.reportId },
  });

  return { ok: true, reportId: amendment.reportId };
}

export async function rejectAmendment(
  amendmentId: number,
  reviewerId: number,
  user: SessionUser,
  comment?: string,
) {
  const amendment = await prisma.dayAmendment.findUnique({
    where: { id: amendmentId },
    include: { report: true },
  });
  if (!amendment) return { error: "Amendment not found", status: 404 as const };
  if (amendment.status !== AmendmentStatus.pending) {
    return { error: "Amendment already resolved", status: 400 as const };
  }
  if (!canReviewAmendment(user, amendment.report.status)) {
    return { error: "Not authorized to reject this correction", status: 403 as const };
  }
  if (!comment?.trim()) {
    return {
      error: "Reason is required when rejecting a correction",
      status: 400 as const,
      requiresComment: true as const,
    };
  }

  await prisma.dayAmendment.update({
    where: { id: amendmentId },
    data: {
      status: AmendmentStatus.rejected,
      reviewedById: reviewerId,
      reviewComment: comment?.trim() || null,
      resolvedAt: new Date(),
    },
  });

  await logAudit({
    userId: reviewerId,
    action: "AMENDMENT_REJECT",
    entityType: "day_amendment",
    entityId: amendmentId,
  });

  return { ok: true };
}

export function describeAmendment(
  action: AmendmentAction,
  payload: unknown,
): string {
  if (action === AmendmentAction.delete_entry) {
    return "Remove entry";
  }
  const p = payload as AddEntryAmendmentPayload;
  const flight =
    p.flightNumber && p.route
      ? ` ${p.flightNumber} ${p.route}${p.shift ? ` shift ${p.shift}` : ""}`
      : "";
  const persons = p.personName ? ` ${p.personName}` : "";
  const detail = flight || persons || (p.nationalityCode ? ` ${p.nationalityCode}` : "");
  if (action === AmendmentAction.update_entry) {
    return `Update ${p.entryType}${detail} → ${p.male}M ${p.female}F`;
  }
  return `Add ${p.entryType}${detail} — ${p.male}M ${p.female}F`;
}
