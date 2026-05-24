import { prisma } from "@/lib/prisma";
import { ReportStatus } from "@prisma/client";
import { parseReportDate } from "@/lib/utils";
import { loadCountries } from "@/lib/countries/service";
import {
  formatStationConsolidated,
  toStationConsolidatedTableRow,
} from "@/lib/reports/consolidated-formatter";
import { reportInclude, reportToConsolidatedInput } from "@/lib/reports/report-service";

export async function loadConsolidatedForDate(dateStr: string) {
  await loadCountries();

  const reports = await prisma.stationDailyReport.findMany({
    where: {
      reportDate: parseReportDate(dateStr),
      status: ReportStatus.approved,
    },
    include: reportInclude,
    orderBy: [{ station: { displayOrder: "asc" } }, { station: { name: "asc" } }],
  });

  const rows = reports.map((r) => {
    const input = reportToConsolidatedInput(r);
    return {
      id: r.id,
      station: r.station.name,
      code: r.station.code,
      text: formatStationConsolidated(input),
      table: toStationConsolidatedTableRow(input),
    };
  });

  const consolidated = [
    `CONSOLIDATED DAILY SITREP — ${dateStr}`,
    `Stations: ${reports.length}`,
    "",
    ...rows.flatMap((s) => [s.text, ""]),
  ].join("\n");

  return {
    date: dateStr,
    stationCount: reports.length,
    consolidated,
    stations: rows,
    tableRows: rows.map((s) => s.table),
  };
}
