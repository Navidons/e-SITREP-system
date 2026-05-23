import { prisma } from "@/lib/prisma";
import { ReportStatus, MovementType } from "@prisma/client";
import { parseReportDate } from "@/lib/utils";
import {
  aggregateMovements,
  aggregateSpecialCategories,
  movementTotals,
} from "@/lib/reports/aggregate";
import { reportInclude } from "@/lib/reports/report-service";
import { logAudit } from "@/lib/audit";

export const entryInclude = {
  ...reportInclude,
  movements: {
    orderBy: { recordedAt: "desc" as const },
    include: {
      enteredBy: { select: { id: true, fullName: true, username: true } },
    },
  },
  specialCategories: {
    orderBy: { recordedAt: "desc" as const },
    include: {
      enteredBy: { select: { id: true, fullName: true, username: true } },
    },
  },
};

export async function ensureDailyReport(
  stationId: number,
  userId: number,
  reportDateStr: string,
) {
  const reportDate = parseReportDate(reportDateStr);
  return prisma.stationDailyReport.upsert({
    where: { stationId_reportDate: { stationId, reportDate } },
    create: { stationId, reportDate, submittedById: userId, status: ReportStatus.draft },
    update: {},
  });
}

export function buildDaySummary(
  report: NonNullable<
    Awaited<ReturnType<typeof prisma.stationDailyReport.findUnique>>
  > & {
    movements: Array<{
      movementType: MovementType;
      nationalityCode: string;
      male: number;
      female: number;
    }>;
    specialCategories: Array<{
      category: string;
      male: number;
      female: number;
    }>;
  },
) {
  const movements = report.movements.map((m) => ({
    movementType: m.movementType,
    nationalityCode: m.nationalityCode,
    male: m.male,
    female: m.female,
  }));

  const arrivals = aggregateMovements(
    movements.filter((m) => m.movementType === MovementType.arrival),
  );
  const departures = aggregateMovements(
    movements.filter((m) => m.movementType === MovementType.departure),
  );
  const special = aggregateSpecialCategories(report.specialCategories);

  return {
    arrivals: {
      rows: arrivals,
      ...movementTotals(movements, "arrival"),
    },
    departures: {
      rows: departures,
      ...movementTotals(movements, "departure"),
    },
    specialCategories: special,
  };
}

export type EntryType =
  | "arrival"
  | "departure"
  | "asylum_seeker"
  | "refugee";

export async function addDayEntry(params: {
  stationId: number;
  userId: number;
  reportDate: string;
  entryType: EntryType;
  nationalityCode?: string;
  male: number;
  female: number;
  recordedAt?: string;
  notes?: string;
}) {
  const report = await ensureDailyReport(
    params.stationId,
    params.userId,
    params.reportDate,
  );

  if (report.status !== ReportStatus.draft && report.status !== ReportStatus.rejected) {
    return { error: "Cannot add entries after report is submitted", status: 400 as const };
  }

  const recordedAt = params.recordedAt
    ? new Date(params.recordedAt)
    : new Date();

  if (params.entryType === "arrival" || params.entryType === "departure") {
    const code = params.nationalityCode?.toUpperCase();
    if (!code) {
      return { error: "Nationality is required", status: 400 as const };
    }
    if (params.male + params.female < 1) {
      return { error: "Enter at least one person", status: 400 as const };
    }

    const entry = await prisma.movement.create({
      data: {
        reportId: report.id,
        movementType:
          params.entryType === "arrival"
            ? MovementType.arrival
            : MovementType.departure,
        nationalityCode: code,
        male: params.male,
        female: params.female,
        recordedAt,
        enteredById: params.userId,
        notes: params.notes,
      },
    });

    await logAudit({
      userId: params.userId,
      action: "CREATE",
      entityType: "movement",
      entityId: entry.id,
      newValues: entry,
    });

    return { entry, kind: "movement" as const };
  }

  const category =
    params.entryType === "asylum_seeker" ? "asylum_seekers" : "refugees";
  if (params.male + params.female < 1) {
    return { error: "Enter at least one person", status: 400 as const };
  }

  const entry = await prisma.specialCategory.create({
    data: {
      reportId: report.id,
      category,
      nationalityCode: params.nationalityCode?.toUpperCase(),
      male: params.male,
      female: params.female,
      recordedAt,
      enteredById: params.userId,
      notes: params.notes,
    },
  });

  await logAudit({
    userId: params.userId,
    action: "CREATE",
    entityType: "special_category",
    entityId: entry.id,
    newValues: entry,
  });

  return { entry, kind: "special" as const };
}

export async function deleteDayEntry(params: {
  reportId: number;
  entryId: number;
  kind: "movement" | "special";
  userId: number;
}) {
  const report = await prisma.stationDailyReport.findUnique({
    where: { id: params.reportId },
  });
  if (!report) return { error: "Report not found", status: 404 as const };
  if (report.status !== ReportStatus.draft && report.status !== ReportStatus.rejected) {
    return { error: "Cannot delete entries after submission", status: 400 as const };
  }

  if (params.kind === "movement") {
    await prisma.movement.deleteMany({
      where: { id: params.entryId, reportId: params.reportId },
    });
  } else {
    await prisma.specialCategory.deleteMany({
      where: { id: params.entryId, reportId: params.reportId },
    });
  }

  await logAudit({
    userId: params.userId,
    action: "DELETE",
    entityType: params.kind,
    entityId: params.entryId,
  });

  return { ok: true };
}

export async function getDailyReportWithSummary(
  stationId: number,
  reportDateStr: string,
) {
  const report = await prisma.stationDailyReport.findUnique({
    where: {
      stationId_reportDate: {
        stationId,
        reportDate: parseReportDate(reportDateStr),
      },
    },
    include: entryInclude,
  });

  if (!report) return null;

  return {
    ...report,
    summary: buildDaySummary(report),
  };
}
