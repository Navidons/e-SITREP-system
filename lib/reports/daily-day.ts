import { prisma } from "@/lib/prisma";
import {
  DailyEntryType,
  Prisma,
  ReportStatus,
} from "@prisma/client";
import { parseReportDate, formatDateInput } from "@/lib/utils";
import {
  aggregateMovements,
  aggregateSpecialCategories,
  movementTotals,
} from "@/lib/reports/aggregate";
import { logAudit } from "@/lib/audit";
import {
  describeAmendment,
  reportIsLocked,
  requestUpdateEntryAmendment,
} from "@/lib/reports/amendments";
import type { AmendmentAction } from "@prisma/client";
import { isSystemAdmin } from "@/lib/rbac";
import type { SessionUser } from "@/lib/rbac";
import {
  ensureCountriesLoaded,
  resolveCountry,
} from "@/lib/countries/service";
import type { CountryCodeFormat } from "@/lib/countries/types";
import {
  countryCodeForConsolidatedOutput,
  countryCodeForDisplay,
  normalizeCountryCodeForStorage,
} from "@/lib/countries/storage";
import { getUserCountryCodeFormat } from "@/lib/settings/user-settings";
import { entryNeedsNationality } from "@/lib/station/entry-config";
import {
  normalizeEntryPayload,
  validateEntryInput,
  type EntryInputShape,
} from "@/lib/station/validate-entry";

export const dayReportInclude = {
  station: true,
  submittedBy: { select: { id: true, fullName: true, username: true } },
  entries: {
    orderBy: { recordedAt: "desc" as const },
    include: {
      enteredBy: { select: { id: true, fullName: true, username: true } },
    },
  },
  incidents: true,
  amendments: {
    orderBy: { createdAt: "desc" as const },
    include: {
      requestedBy: { select: { fullName: true, username: true } },
      reviewedBy: { select: { fullName: true } },
    },
  },
};

export function todayDateString() {
  return formatDateInput(new Date());
}

export async function ensureDayRecord(
  stationId: number,
  userId: number,
  reportDateStr: string,
) {
  const reportDate = parseReportDate(reportDateStr);
  return prisma.stationDailyReport.upsert({
    where: { stationId_reportDate: { stationId, reportDate } },
    create: {
      stationId,
      reportDate,
      submittedById: userId,
      status: ReportStatus.draft,
    },
    update: {},
  });
}

function entryTypeToMovement(entryType: DailyEntryType) {
  if (entryType === DailyEntryType.arrival) return "arrival" as const;
  if (entryType === DailyEntryType.departure) return "departure" as const;
  return null;
}

function entryTypeToSpecialCategory(entryType: DailyEntryType) {
  if (entryType === DailyEntryType.asylum_seeker) return "asylum_seekers";
  if (entryType === DailyEntryType.refugee) return "refugees";
  return null;
}

function sumPassengers(
  entries: Array<{ male: number; female: number }>,
): number {
  return entries.reduce((s, e) => s + e.male + e.female, 0);
}

export function buildDaySummaryFromEntries(
  entries: Array<{
    entryType: DailyEntryType;
    nationalityCode: string | null;
    male: number;
    female: number;
    flightNumber?: string | null;
    route?: string | null;
    shift?: string | null;
  }>,
) {
  const movementRows = entries
    .filter((e) => entryTypeToMovement(e.entryType))
    .map((e) => ({
      movementType: entryTypeToMovement(e.entryType)!,
      nationalityCode: e.nationalityCode ?? "—",
      male: e.male,
      female: e.female,
    }));

  const specialRows = entries
    .filter((e) => entryTypeToSpecialCategory(e.entryType))
    .map((e) => ({
      category: entryTypeToSpecialCategory(e.entryType)!,
      male: e.male,
      female: e.female,
    }));

  const flightArrivals = entries.filter(
    (e) => e.entryType === DailyEntryType.flight_arrival,
  );
  const flightDepartures = entries.filter(
    (e) => e.entryType === DailyEntryType.flight_departure,
  );

  const countByType = (type: DailyEntryType) =>
    entries
      .filter((e) => e.entryType === type)
      .reduce((s, e) => s + e.male + e.female, 0);

  const arrivals = aggregateMovements(
    movementRows.filter((m) => m.movementType === "arrival"),
  );
  const departures = aggregateMovements(
    movementRows.filter((m) => m.movementType === "departure"),
  );

  return {
    arrivals: {
      rows: arrivals,
      ...movementTotals(movementRows, "arrival"),
    },
    departures: {
      rows: departures,
      ...movementTotals(movementRows, "departure"),
    },
    specialCategories: aggregateSpecialCategories(specialRows),
    air: {
      flightArrivals: {
        flights: flightArrivals.length,
        passengers: sumPassengers(flightArrivals),
      },
      flightDepartures: {
        flights: flightDepartures.length,
        passengers: sumPassengers(flightDepartures),
      },
      deportees: countByType(DailyEntryType.deportee),
      returned: countByType(DailyEntryType.returned_person),
      offloaded: countByType(DailyEntryType.offloaded),
      denied: countByType(DailyEntryType.denied_entry),
    },
  };
}

export function serializeDayReport(
  report: NonNullable<
    Awaited<ReturnType<typeof prisma.stationDailyReport.findUnique>>
  > & {
    station: {
      id: number;
      code: string;
      name: string;
      reportingProfile?: string;
      type?: string | null;
    };
    entries: Array<{
      id: number;
      entryType: DailyEntryType;
      nationalityCode: string | null;
      male: number;
      female: number;
      flightNumber: string | null;
      route: string | null;
      shift: string | null;
      passportNo: string | null;
      personName: string | null;
      recordedAt: Date;
      notes: string | null;
      enteredBy: { fullName: string } | null;
    }>;
    incidents?: Array<{
      id: number;
      incidentType: string | null;
      description: string;
      passportNo: string | null;
      personName: string | null;
      actionTaken: string | null;
      createdAt: Date;
    }>;
    amendments?: Array<{
      id: number;
      status: string;
      action: AmendmentAction;
      payload: unknown;
      reason: string | null;
      reviewComment: string | null;
      targetEntryId: number | null;
      createdAt: Date;
      resolvedAt: Date | null;
      requestedBy: { fullName: string; username?: string } | null;
      reviewedBy: { fullName: string } | null;
    }>;
  },
  reportDateStr: string,
  displayFormat?: CountryCodeFormat,
) {
  const entries =
    displayFormat != null
      ? report.entries.map((e) => ({
          ...e,
          nationalityCode: countryCodeForDisplay(
            e.nationalityCode,
            displayFormat,
          ),
        }))
      : report.entries;
  const summary = buildDaySummaryFromEntries(entries);
  return {
    id: report.id,
    reportDate: reportDateStr,
    status: report.status,
    staffOnDuty: report.staffOnDuty,
    medicalScreening: report.medicalScreening,
    generalRemarks: report.generalRemarks,
    urgentMatters: report.urgentMatters,
    inadmissibleCount: report.inadmissibleCount ?? 0,
    staffLeaveNotes: report.staffLeaveNotes,
    openedAt: report.openedAt,
    station: report.station,
    entries: entries.map((e) => ({
      id: e.id,
      entryType: e.entryType,
      nationalityCode: e.nationalityCode,
      male: e.male,
      female: e.female,
      flightNumber: e.flightNumber,
      route: e.route,
      shift: e.shift,
      passportNo: e.passportNo,
      personName: e.personName,
      recordedAt: e.recordedAt.toISOString(),
      notes: e.notes,
      enteredBy: e.enteredBy,
    })),
    incidents: (report.incidents ?? []).map((i) => ({
      id: i.id,
      incidentType: i.incidentType,
      description: i.description,
      passportNo: i.passportNo,
      personName: i.personName,
      actionTaken: i.actionTaken,
      createdAt: i.createdAt.toISOString(),
    })),
    summary,
    entryCount: report.entries.length,
    amendments: (report.amendments ?? []).map((a) => ({
      id: a.id,
      status: a.status,
      action: a.action,
      summary: describeAmendment(a.action as AmendmentAction, a.payload),
      reason: a.reason,
      reviewComment: a.reviewComment,
      targetEntryId: a.targetEntryId,
      createdAt: a.createdAt.toISOString(),
      resolvedAt: a.resolvedAt?.toISOString() ?? null,
      requestedBy: a.requestedBy,
      reviewedBy: a.reviewedBy,
    })),
    pendingAmendmentCount: (report.amendments ?? []).filter(
      (a) => a.status === "pending",
    ).length,
  };
}

export async function getDayRecord(
  stationId: number,
  reportDateStr: string,
  options?: { displayFormat?: CountryCodeFormat },
) {
  const report = await prisma.stationDailyReport.findUnique({
    where: {
      stationId_reportDate: {
        stationId,
        reportDate: parseReportDate(reportDateStr),
      },
    },
    include: dayReportInclude,
  });

  if (!report) return null;
  return serializeDayReport(report, reportDateStr, options?.displayFormat);
}

export async function getDayRecordForUser(
  stationId: number,
  reportDateStr: string,
  userId: number,
) {
  const displayFormat = await getUserCountryCodeFormat(userId);
  return getDayRecord(stationId, reportDateStr, { displayFormat });
}

export type DayListItem = {
  reportDate: string;
  status: string;
  entryCount: number;
  id: number;
};

export type DayListQuery = {
  limit?: number;
  cursor?: string;
  year?: number;
  month?: number;
  excludeDate?: string;
};

export type DayListResult = {
  days: DayListItem[];
  nextCursor: string | null;
  total: number;
};

function buildDayListWhere(
  stationId: number,
  query: DayListQuery,
): Prisma.StationDailyReportWhereInput {
  const where: Prisma.StationDailyReportWhereInput = { stationId };

  if (query.year) {
    const year = query.year;
    if (query.month && query.month >= 1 && query.month <= 12) {
      const month = query.month;
      where.reportDate = {
        gte: new Date(Date.UTC(year, month - 1, 1)),
        lte: new Date(Date.UTC(year, month, 0)),
      };
    } else {
      where.reportDate = {
        gte: new Date(Date.UTC(year, 0, 1)),
        lte: new Date(Date.UTC(year + 1, 0, 0)),
      };
    }
  }

  if (query.cursor) {
    const before = parseReportDate(query.cursor);
    const existing = where.reportDate;
    if (
      existing &&
      typeof existing === "object" &&
      !Array.isArray(existing) &&
      ("gte" in existing || "lte" in existing)
    ) {
      where.reportDate = { ...existing, lt: before };
    } else {
      where.reportDate = { lt: before };
    }
  }

  if (query.excludeDate) {
    where.NOT = { reportDate: parseReportDate(query.excludeDate) };
  }

  return where;
}

function mapDayListRows(
  reports: Array<{
    id: number;
    reportDate: Date;
    status: ReportStatus;
    _count: { entries: number };
  }>,
): DayListItem[] {
  return reports.map((r) => ({
    reportDate: formatDateInput(r.reportDate),
    status: r.status,
    entryCount: r._count.entries,
    id: r.id,
  }));
}

export async function listDayRecordsPaginated(
  stationId: number,
  query: DayListQuery = {},
): Promise<DayListResult> {
  const limit = Math.min(Math.max(query.limit ?? 25, 1), 100);
  const where = buildDayListWhere(stationId, query);

  const [total, reports] = await Promise.all([
    prisma.stationDailyReport.count({ where }),
    prisma.stationDailyReport.findMany({
      where,
      orderBy: { reportDate: "desc" },
      take: limit,
      include: {
        _count: { select: { entries: true } },
      },
    }),
  ]);

  const days = mapDayListRows(reports);
  const nextCursor =
    days.length === limit ? days[days.length - 1].reportDate : null;

  return { days, nextCursor, total };
}

export async function listDayRecords(stationId: number, limit = 30) {
  const { days } = await listDayRecordsPaginated(stationId, { limit });
  return days;
}

export async function getDayRecordYears(stationId: number): Promise<number[]> {
  const rows = await prisma.$queryRaw<{ year: number }[]>`
    SELECT DISTINCT EXTRACT(YEAR FROM report_date)::int AS year
    FROM station_daily_reports
    WHERE station_id = ${stationId}
    ORDER BY year DESC
  `;
  return rows.map((r) => r.year);
}

export async function getDayRecordMonthCounts(
  stationId: number,
  year: number,
): Promise<Record<number, number>> {
  const rows = await prisma.$queryRaw<{ month: number; count: number }[]>`
    SELECT EXTRACT(MONTH FROM report_date)::int AS month, COUNT(*)::int AS count
    FROM station_daily_reports
    WHERE station_id = ${stationId}
      AND EXTRACT(YEAR FROM report_date) = ${year}
    GROUP BY month
    ORDER BY month
  `;
  return Object.fromEntries(rows.map((r) => [r.month, r.count]));
}

export type EntryTypeInput =
  | "arrival"
  | "departure"
  | "asylum_seeker"
  | "refugee"
  | "flight_arrival"
  | "flight_departure"
  | "deportee"
  | "returned_person"
  | "offloaded"
  | "denied_entry";

async function resolveNationalityForStorage(
  entryType: EntryTypeInput,
  rawCode: string | undefined,
): Promise<{ error: string } | { nationalityCode: string | null }> {
  if (!entryNeedsNationality(entryType)) {
    if (!rawCode?.trim()) return { nationalityCode: null };
  } else if (!rawCode?.trim()) {
    return { error: "Nationality is required" };
  }
  if (!rawCode?.trim()) return { nationalityCode: null };
  await ensureCountriesLoaded();
  const nationalityCode = normalizeCountryCodeForStorage(rawCode);
  if (!resolveCountry(rawCode) && !resolveCountry(nationalityCode)) {
    return { error: "Unknown country code" };
  }
  return { nationalityCode };
}

function buildEntryDataFromParams(
  entryType: EntryTypeInput,
  validated: ReturnType<typeof normalizeEntryPayload>,
  nationalityCode: string | null,
) {
  return {
    entryType: entryType as DailyEntryType,
    nationalityCode,
    male: validated.male,
    female: validated.female,
    flightNumber: validated.flightNumber,
    route: validated.route,
    shift: validated.shift,
    passportNo: validated.passportNo,
    personName: validated.personName,
    notes: validated.notes,
  };
}

export async function addDayEntry(params: {
  stationId: number;
  userId: number;
  reportDate: string;
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
  bypassLock?: boolean;
}) {
  const report = await ensureDayRecord(
    params.stationId,
    params.userId,
    params.reportDate,
  );

  if (
    reportIsLocked(report.status) &&
    !params.bypassLock
  ) {
    return {
      locked: true as const,
      error:
        "This day is already submitted. Only administrators can add new entries. Edit existing entries instead.",
      status: 423 as const,
    };
  }

  const shape: EntryInputShape = {
    entryType: params.entryType,
    nationalityCode: params.nationalityCode,
    male: params.male,
    female: params.female,
    flightNumber: params.flightNumber,
    route: params.route,
    shift: params.shift,
    passportNo: params.passportNo,
    personName: params.personName,
    notes: params.notes,
  };
  const validation = validateEntryInput(shape);
  if ("error" in validation) {
    return { error: validation.error, status: 400 as const };
  }

  const normalized = normalizeEntryPayload(shape);
  const natResult = await resolveNationalityForStorage(
    params.entryType,
    normalized.nationalityCode ?? params.nationalityCode,
  );
  if ("error" in natResult) {
    return { error: natResult.error, status: 400 as const };
  }

  const entryData = buildEntryDataFromParams(
    params.entryType,
    normalized,
    natResult.nationalityCode,
  );

  const entry = await prisma.dailyEntry.create({
    data: {
      reportId: report.id,
      ...entryData,
      recordedAt: params.recordedAt ? new Date(params.recordedAt) : new Date(),
      enteredById: params.userId,
    },
  });

  await logAudit({
    userId: params.userId,
    action: "CREATE",
    entityType: "daily_entry",
    entityId: entry.id,
    newValues: { reportDate: params.reportDate, ...entry },
  });

  return { entry };
}

export type UpdateEntryInput = {
  entryType?: EntryTypeInput;
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

export async function updateDayEntry(params: {
  stationId: number;
  userId: number;
  reportDate: string;
  entryId: number;
  entry: UpdateEntryInput;
  correctionReason?: string;
  user: SessionUser;
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

  const existing = await prisma.dailyEntry.findFirst({
    where: { id: params.entryId, reportId: report.id },
  });
  if (!existing) return { error: "Entry not found", status: 404 as const };

  const entryType = (params.entry.entryType ?? existing.entryType) as EntryTypeInput;
  const shape: EntryInputShape = {
    entryType,
    nationalityCode:
      params.entry.nationalityCode ?? existing.nationalityCode ?? undefined,
    male: params.entry.male,
    female: params.entry.female,
    flightNumber: params.entry.flightNumber ?? existing.flightNumber ?? undefined,
    route: params.entry.route ?? existing.route ?? undefined,
    shift: params.entry.shift ?? existing.shift ?? undefined,
    passportNo: params.entry.passportNo ?? existing.passportNo ?? undefined,
    personName: params.entry.personName ?? existing.personName ?? undefined,
    notes: params.entry.notes !== undefined ? params.entry.notes : existing.notes ?? undefined,
  };
  const validation = validateEntryInput(shape);
  if ("error" in validation) {
    return { error: validation.error, status: 400 as const };
  }

  const normalized = normalizeEntryPayload(shape);
  const natResult = await resolveNationalityForStorage(
    entryType,
    normalized.nationalityCode ?? undefined,
  );
  if ("error" in natResult) {
    return { error: natResult.error, status: 400 as const };
  }

  const entryData = buildEntryDataFromParams(
    entryType,
    normalized,
    natResult.nationalityCode,
  );

  const patch = {
    ...entryData,
    recordedAt: params.entry.recordedAt
      ? new Date(params.entry.recordedAt)
      : existing.recordedAt,
  };

  if (!reportIsLocked(report.status) || isSystemAdmin(params.user)) {
    const updated = await prisma.dailyEntry.update({
      where: { id: params.entryId },
      data: patch,
    });
    await logAudit({
      userId: params.userId,
      action: "UPDATE",
      entityType: "daily_entry",
      entityId: params.entryId,
      newValues: patch,
    });
    return { entry: updated, reconciled: true as const };
  }

  if (!params.correctionReason?.trim()) {
    return {
      error: "Reason required — edits on submitted days need HQ approval",
      status: 400 as const,
      requiresAmendment: true as const,
    };
  }

  return requestUpdateEntryAmendment({
    stationId: params.stationId,
    userId: params.userId,
    reportDate: params.reportDate,
    entryId: params.entryId,
    reason: params.correctionReason,
    entry: {
      entryType,
      nationalityCode: entryData.nationalityCode ?? undefined,
      male: entryData.male,
      female: entryData.female,
      flightNumber: entryData.flightNumber ?? undefined,
      route: entryData.route ?? undefined,
      shift: entryData.shift ?? undefined,
      passportNo: entryData.passportNo ?? undefined,
      personName: entryData.personName ?? undefined,
      recordedAt: params.entry.recordedAt,
      notes: entryData.notes ?? undefined,
    },
  });
}

export async function deleteDayEntry(params: {
  stationId: number;
  userId: number;
  reportDate: string;
  entryId: number;
  bypassLock?: boolean;
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
  if (reportIsLocked(report.status) && !params.bypassLock) {
    return {
      locked: true as const,
      error: "Submit a removal request for HQ approval.",
      status: 423 as const,
    };
  }

  await prisma.dailyEntry.deleteMany({
    where: { id: params.entryId, reportId: report.id },
  });

  await logAudit({
    userId: params.userId,
    action: "DELETE",
    entityType: "daily_entry",
    entityId: params.entryId,
  });

  return { ok: true };
}

export async function updateDayRemarks(
  reportId: number,
  data: {
    staffOnDuty?: number;
    medicalScreening?: string;
    generalRemarks?: string;
    urgentMatters?: string;
    inadmissibleCount?: number;
    staffLeaveNotes?: string;
  },
) {
  return prisma.stationDailyReport.update({
    where: { id: reportId },
    data: {
      staffOnDuty: data.staffOnDuty ?? 0,
      medicalScreening: data.medicalScreening,
      generalRemarks: data.generalRemarks,
      urgentMatters: data.urgentMatters,
      inadmissibleCount: data.inadmissibleCount ?? 0,
      staffLeaveNotes: data.staffLeaveNotes,
    },
  });
}

export async function addDayIncident(params: {
  stationId: number;
  userId: number;
  reportDate: string;
  incidentType?: string;
  description: string;
  passportNo?: string;
  personName?: string;
  actionTaken?: string;
}) {
  const report = await ensureDayRecord(
    params.stationId,
    params.userId,
    params.reportDate,
  );
  if (!params.description.trim()) {
    return { error: "Description is required", status: 400 as const };
  }
  const incident = await prisma.incident.create({
    data: {
      reportId: report.id,
      incidentType: params.incidentType?.trim() || "occurrence",
      description: params.description.trim(),
      passportNo: params.passportNo?.trim(),
      personName: params.personName?.trim(),
      actionTaken: params.actionTaken?.trim(),
    },
  });
  await logAudit({
    userId: params.userId,
    action: "CREATE",
    entityType: "incident",
    entityId: incident.id,
    newValues: incident,
  });
  return { incident };
}

export async function deleteDayIncident(params: {
  stationId: number;
  userId: number;
  reportDate: string;
  incidentId: number;
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
  if (reportIsLocked(report.status)) {
    return {
      error: "Cannot remove occurrences on a submitted day without HQ workflow",
      status: 423 as const,
    };
  }
  await prisma.incident.deleteMany({
    where: { id: params.incidentId, reportId: report.id },
  });
  return { ok: true };
}

export function reportToConsolidatedInput(
  report: {
    station: { code: string; name: string };
    entries: Array<{
      entryType: DailyEntryType;
      nationalityCode: string | null;
      male: number;
      female: number;
    }>;
  },
) {
  const summary = buildDaySummaryFromEntries(report.entries);
  return {
    stationCode: report.station.code,
    stationName: report.station.name,
    movements: [
      ...summary.arrivals.rows.map((r) => ({
        movementType: "arrival" as const,
        nationalityCode:
          r.nationalityCode === "—"
            ? r.nationalityCode
            : countryCodeForConsolidatedOutput(r.nationalityCode),
        male: r.male,
        female: r.female,
      })),
      ...summary.departures.rows.map((r) => ({
        movementType: "departure" as const,
        nationalityCode:
          r.nationalityCode === "—"
            ? r.nationalityCode
            : countryCodeForConsolidatedOutput(r.nationalityCode),
        male: r.male,
        female: r.female,
      })),
    ],
    specialCategories: summary.specialCategories,
  };
}
