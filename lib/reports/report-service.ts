import { prisma } from "@/lib/prisma";
import type { DailyReportPayload } from "@/types/reports";
import { MovementType, ReportStatus } from "@prisma/client";
import { parseReportDate } from "@/lib/utils";

export const reportInclude = {
  station: true,
  movements: true,
  specialCategories: true,
  incidents: true,
  submittedBy: { select: { id: true, fullName: true, username: true } },
};

export async function upsertDailyReport(
  stationId: number,
  userId: number,
  payload: DailyReportPayload,
  status: ReportStatus = ReportStatus.draft,
) {
  const reportDate = parseReportDate(payload.reportDate);

  const report = await prisma.stationDailyReport.upsert({
    where: {
      stationId_reportDate: { stationId, reportDate },
    },
    create: {
      stationId,
      reportDate,
      submittedById: userId,
      status,
      staffOnDuty: payload.staffOnDuty ?? 0,
      medicalScreening: payload.medicalScreening,
      generalRemarks: payload.generalRemarks,
      urgentMatters: payload.urgentMatters,
    },
    update: {
      staffOnDuty: payload.staffOnDuty ?? 0,
      medicalScreening: payload.medicalScreening,
      generalRemarks: payload.generalRemarks,
      urgentMatters: payload.urgentMatters,
      status,
      submittedById: userId,
    },
  });

  await prisma.movement.deleteMany({ where: { reportId: report.id } });
  await prisma.specialCategory.deleteMany({ where: { reportId: report.id } });
  await prisma.incident.deleteMany({ where: { reportId: report.id } });

  if (payload.movements.length > 0) {
    await prisma.movement.createMany({
      data: payload.movements.map((m) => ({
        reportId: report.id,
        movementType:
          m.movementType === "arrival"
            ? MovementType.arrival
            : MovementType.departure,
        nationalityCode: m.nationalityCode.toUpperCase(),
        male: m.male,
        female: m.female,
      })),
    });
  }

  if (payload.specialCategories?.length) {
    await prisma.specialCategory.createMany({
      data: payload.specialCategories.map((s) => ({
        reportId: report.id,
        category: s.category,
        male: s.male,
        female: s.female,
        details: s.details,
      })),
    });
  }

  if (payload.incidents?.length) {
    await prisma.incident.createMany({
      data: payload.incidents.map((i) => ({
        reportId: report.id,
        incidentType: i.incidentType,
        description: i.description,
        passportNo: i.passportNo,
        personName: i.personName,
        actionTaken: i.actionTaken,
      })),
    });
  }

  return prisma.stationDailyReport.findUnique({
    where: { id: report.id },
    include: reportInclude,
  });
}

export function reportToConsolidatedInput(
  report: NonNullable<
    Awaited<ReturnType<typeof prisma.stationDailyReport.findFirst>>
  > & {
    station: { code: string; name: string };
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
  return {
    stationCode: report.station.code,
    stationName: report.station.name,
    movements: report.movements.map((m) => ({
      movementType: m.movementType as "arrival" | "departure",
      nationalityCode: m.nationalityCode,
      male: m.male,
      female: m.female,
    })),
    specialCategories: report.specialCategories.map((s) => ({
      category: s.category,
      male: s.male,
      female: s.female,
    })),
  };
}
