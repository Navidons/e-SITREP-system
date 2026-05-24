import ExcelJS from "exceljs";
import { DailyEntryType, ReportStatus } from "@prisma/client";

export type WeeklyReportRow = {
  stationId: number;
  reportDate: Date;
  entries: Array<{
    entryType: DailyEntryType;
    male: number;
    female: number;
  }>;
};

export type WeeklyStationRow = {
  id: number;
  name: string;
  code: string;
};

const MOVEMENT_ARRIVAL_TYPES = new Set<DailyEntryType>([
  DailyEntryType.arrival,
  DailyEntryType.flight_arrival,
]);

const MOVEMENT_DEPARTURE_TYPES = new Set<DailyEntryType>([
  DailyEntryType.departure,
  DailyEntryType.flight_departure,
]);

export function displayStationName(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** e.g. 2026-05-02 → "02nd May" */
export function formatWeeklyDayHeader(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00.000Z`);
  const day = d.getUTCDate();
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th";
  const month = d.toLocaleString("en-GB", { month: "short", timeZone: "UTC" });
  return `${day.toString().padStart(2, "0")}${suffix} ${month}`;
}

export function listDatesInclusive(fromIso: string, toIso: string): string[] {
  const from = new Date(`${fromIso}T00:00:00.000Z`);
  const to = new Date(`${toIso}T00:00:00.000Z`);
  const dates: string[] = [];
  for (let d = new Date(from); d <= to; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

export function dayMovementTotals(
  entries: WeeklyReportRow["entries"],
): { arrivals: number; departures: number } {
  let arrivals = 0;
  let departures = 0;
  for (const e of entries) {
    const n = e.male + e.female;
    if (MOVEMENT_ARRIVAL_TYPES.has(e.entryType)) arrivals += n;
    if (MOVEMENT_DEPARTURE_TYPES.has(e.entryType)) departures += n;
  }
  return { arrivals, departures };
}

export function buildMovementLookup(
  reports: WeeklyReportRow[],
): Map<string, { arrivals: number; departures: number }> {
  const map = new Map<string, { arrivals: number; departures: number }>();
  for (const r of reports) {
    const date = r.reportDate.toISOString().slice(0, 10);
    const key = `${r.stationId}:${date}`;
    map.set(key, dayMovementTotals(r.entries));
  }
  return map;
}

export const WEEKLY_EXPORT_STATUSES: ReportStatus[] = [
  ReportStatus.approved,
];

export async function buildWeeklyStatisticsWorkbook(params: {
  from: string;
  to: string;
  stations: WeeklyStationRow[];
  reports: WeeklyReportRow[];
  sheetTitle?: string;
}): Promise<ExcelJS.Workbook> {
  const { from, to, stations, reports } = params;
  const dates = listDatesInclusive(from, to);
  const lookup = buildMovementLookup(reports);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "e-SITREP";
  const sheet = workbook.addWorksheet(params.sheetTitle ?? "Weekly Statistics");

  const dayStartCol = 3;
  const weeklyArrCol = dayStartCol + dates.length * 2;
  const weeklyDepCol = weeklyArrCol + 1;
  const lastCol = weeklyDepCol;

  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2EFDA" },
  };
  const totalFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFF2CC" },
  };

  const row1 = sheet.getRow(1);
  row1.getCell(1).value = "";
  row1.getCell(2).value = "";
  dates.forEach((date, i) => {
    const col = dayStartCol + i * 2;
    row1.getCell(col).value = formatWeeklyDayHeader(date);
    sheet.mergeCells(1, col, 1, col + 1);
    const cell = row1.getCell(col);
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.font = { bold: true };
    cell.fill = headerFill;
  });

  const row2 = sheet.getRow(2);
  row2.getCell(1).value = "S/N";
  row2.getCell(2).value = "Entry/ Exit Points.";
  dates.forEach((_, i) => {
    const col = dayStartCol + i * 2;
    row2.getCell(col).value = "Arrivals";
    row2.getCell(col + 1).value = "Departures";
  });
  row2.getCell(weeklyArrCol).value = "Arrival (weekly)";
  row2.getCell(weeklyDepCol).value = "Departures (weekly)";
  for (let c = 1; c <= lastCol; c++) {
    const cell = row2.getCell(c);
    cell.font = { bold: true };
    cell.fill = headerFill;
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  }
  row2.getCell(2).alignment = { horizontal: "left" };

  stations.forEach((station, idx) => {
    const rowNum = 3 + idx;
    const row = sheet.getRow(rowNum);
    let weekArr = 0;
    let weekDep = 0;

    row.getCell(1).value = idx + 1;
    row.getCell(2).value = displayStationName(station.name);

    dates.forEach((date, i) => {
      const key = `${station.id}:${date}`;
      const totals = lookup.get(key) ?? { arrivals: 0, departures: 0 };
      const col = dayStartCol + i * 2;
      row.getCell(col).value = totals.arrivals;
      row.getCell(col + 1).value = totals.departures;
      weekArr += totals.arrivals;
      weekDep += totals.departures;
    });

    row.getCell(weeklyArrCol).value = weekArr;
    row.getCell(weeklyDepCol).value = weekDep;

    row.getCell(1).alignment = { horizontal: "center" };
    for (let c = dayStartCol; c <= lastCol; c++) {
      row.getCell(c).alignment = { horizontal: "center" };
      row.getCell(c).numFmt = "#,##0";
    }
  });

  const totalRowNum = 3 + stations.length;
  const totalRow = sheet.getRow(totalRowNum);
  totalRow.getCell(1).value = "";
  totalRow.getCell(2).value = "GRAND TOTAL";
  totalRow.getCell(2).font = { bold: true };

  dates.forEach((_, i) => {
    const col = dayStartCol + i * 2;
    const firstData = 3;
    const lastData = 3 + stations.length - 1;
    const arrCol = colLetter(col);
    const depCol = colLetter(col + 1);
    totalRow.getCell(col).value = {
      formula: `SUM(${arrCol}${firstData}:${arrCol}${lastData})`,
    };
    totalRow.getCell(col + 1).value = {
      formula: `SUM(${depCol}${firstData}:${depCol}${lastData})`,
    };
  });

  const wArr = colLetter(weeklyArrCol);
  const wDep = colLetter(weeklyDepCol);
  const firstData = 3;
  const lastData = 3 + stations.length - 1;
  totalRow.getCell(weeklyArrCol).value = {
    formula: `SUM(${wArr}${firstData}:${wArr}${lastData})`,
  };
  totalRow.getCell(weeklyDepCol).value = {
    formula: `SUM(${wDep}${firstData}:${wDep}${lastData})`,
  };

  for (let c = dayStartCol; c <= lastCol; c++) {
    const cell = totalRow.getCell(c);
    cell.font = { bold: true };
    cell.fill = totalFill;
    cell.numFmt = "#,##0";
  }

  sheet.getColumn(1).width = 6;
  sheet.getColumn(2).width = 22;
  for (let c = dayStartCol; c <= lastCol; c++) {
    sheet.getColumn(c).width = 11;
  }

  sheet.views = [{ state: "frozen", ySplit: 2, xSplit: 2 }];

  return workbook;
}

function colLetter(col: number): string {
  let s = "";
  let n = col;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}
