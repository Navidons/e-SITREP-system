import { prisma } from "@/lib/prisma";
import { ReportStatus } from "@prisma/client";
import { parseReportDate } from "@/lib/utils";
import { dayReportInclude, reportToConsolidatedInput } from "@/lib/reports/daily-day";

export const reportInclude = dayReportInclude;

export async function updateReportRemarks(
  reportId: number,
  payload: {
    staffOnDuty?: number;
    medicalScreening?: string;
    generalRemarks?: string;
    urgentMatters?: string;
  },
) {
  return prisma.stationDailyReport.update({
    where: { id: reportId },
    data: {
      staffOnDuty: payload.staffOnDuty ?? 0,
      medicalScreening: payload.medicalScreening,
      generalRemarks: payload.generalRemarks,
      urgentMatters: payload.urgentMatters,
    },
    include: reportInclude,
  });
}

export { reportToConsolidatedInput };

export async function getApprovedReportsForDate(dateStr: string) {
  return prisma.stationDailyReport.findMany({
    where: {
      reportDate: parseReportDate(dateStr),
      status: ReportStatus.approved,
    },
    include: {
      station: true,
      entries: true,
    },
    orderBy: { station: { name: "asc" } },
  });
}
