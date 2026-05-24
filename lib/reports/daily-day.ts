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
  ensureCountriesLoaded,
  normalizeCountryCode,
  resolveCountry,
} from "@/lib/countries/service";
import { getUserCountryCodeFormat } from "@/lib/settings/user-settings";

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

export function buildDaySummaryFromEntries(
  entries: Array<{
    entryType: DailyEntryType;
    nationalityCode: string | null;
    male: number;
    female: number;
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
  };
}

export function serializeDayReport(
  report: NonNullable<
    Awaited<ReturnType<typeof prisma.stationDailyReport.findUnique>>
  > & {
    station: { id: number; code: string; name: string };
    entries: Array<{
      id: number;
      entryType: DailyEntryType;
      nationalityCode: string | null;
      male: number;
      female: number;
      recordedAt: Date;
      notes: string | null;
      enteredBy: { fullName: string } | null;
    }>;
  },
  reportDateStr: string,
) {
  const summary = buildDaySummaryFromEntries(report.entries);
  return {
    id: report.id,
    reportDate: reportDateStr,
    status: report.status,
    staffOnDuty: report.staffOnDuty,
    medicalScreening: report.medicalScreening,
    generalRemarks: report.generalRemarks,
    urgentMatters: report.urgentMatters,
    openedAt: report.openedAt,
    station: report.station,
    entries: report.entries.map((e) => ({
      id: e.id,
      entryType: e.entryType,
      nationalityCode: e.nationalityCode,
      male: e.male,
      female: e.female,
      recordedAt: e.recordedAt.toISOString(),
      notes: e.notes,
      enteredBy: e.enteredBy,
    })),
    summary,
    entryCount: report.entries.length,
  };
}

export async function getDayRecord(stationId: number, reportDateStr: string) {
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
  return serializeDayReport(report, reportDateStr);
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
  | "refugee";

export async function addDayEntry(params: {
  stationId: number;
  userId: number;
  reportDate: string;
  entryType: EntryTypeInput;
  nationalityCode?: string;
  male: number;
  female: number;
  recordedAt?: string;
  notes?: string;
}) {
  const report = await ensureDayRecord(
    params.stationId,
    params.userId,
    params.reportDate,
  );

  if (report.status !== ReportStatus.draft && report.status !== ReportStatus.rejected) {
    return {
      error: "This day is locked. HQ must reject before new entries can be added.",
      status: 400 as const,
    };
  }

  const needsNationality =
    params.entryType === "arrival" || params.entryType === "departure";
  const rawCode = params.nationalityCode?.trim().toUpperCase();
  if (needsNationality && !rawCode) {
    return { error: "Nationality is required", status: 400 as const };
  }
  if (params.male + params.female < 1) {
    return { error: "Enter at least one person", status: 400 as const };
  }

  let nationalityCode: string | undefined = rawCode;
  if (rawCode) {
    await ensureCountriesLoaded();
    const format = await getUserCountryCodeFormat(params.userId);
    nationalityCode = normalizeCountryCode(rawCode, format);
    if (!resolveCountry(rawCode) && !resolveCountry(nationalityCode)) {
      return { error: "Unknown country code", status: 400 as const };
    }
  }

  const entry = await prisma.dailyEntry.create({
    data: {
      reportId: report.id,
      entryType: params.entryType as DailyEntryType,
      nationalityCode,
      male: params.male,
      female: params.female,
      recordedAt: params.recordedAt ? new Date(params.recordedAt) : new Date(),
      enteredById: params.userId,
      notes: params.notes,
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

export async function deleteDayEntry(params: {
  stationId: number;
  userId: number;
  reportDate: string;
  entryId: number;
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
  if (report.status !== ReportStatus.draft && report.status !== ReportStatus.rejected) {
    return { error: "Cannot delete entries on a submitted day", status: 400 as const };
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
  },
) {
  return prisma.stationDailyReport.update({
    where: { id: reportId },
    data: {
      staffOnDuty: data.staffOnDuty ?? 0,
      medicalScreening: data.medicalScreening,
      generalRemarks: data.generalRemarks,
      urgentMatters: data.urgentMatters,
    },
  });
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
        nationalityCode: r.nationalityCode,
        male: r.male,
        female: r.female,
      })),
      ...summary.departures.rows.map((r) => ({
        movementType: "departure" as const,
        nationalityCode: r.nationalityCode,
        male: r.male,
        female: r.female,
      })),
    ],
    specialCategories: summary.specialCategories,
  };
}
