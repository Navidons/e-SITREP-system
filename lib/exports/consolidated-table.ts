import ExcelJS from "exceljs";
import type { StationConsolidatedTableRow } from "@/lib/reports/consolidated-formatter";
import { displayStationName } from "@/lib/exports/weekly-matrix";

export async function buildConsolidatedSitrepWorkbook(params: {
  date: string;
  rows: StationConsolidatedTableRow[];
  sheetTitle?: string;
}) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(params.sheetTitle ?? "Consolidated SITREP");

  sheet.mergeCells(1, 1, 1, 6);
  const title = sheet.getCell(1, 1);
  title.value = `CONSOLIDATED DAILY SITREP — ${params.date}`;
  title.font = { bold: true, size: 14 };
  title.alignment = { horizontal: "center" };

  sheet.mergeCells(2, 1, 2, 6);
  sheet.getCell(2, 1).value = `Approved stations: ${params.rows.length}`;
  sheet.getCell(2, 1).alignment = { horizontal: "center" };

  const headerRow = 4;
  const headers = [
    "S/N",
    "Entry / Exit Point",
    "Code",
    "Arrivals",
    "Departures",
    "Asylum seekers",
  ];
  headers.forEach((h, i) => {
    const cell = sheet.getCell(headerRow, i + 1);
    cell.value = h;
    cell.font = { bold: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE8E8E8" },
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  params.rows.forEach((row, index) => {
    const r = headerRow + 1 + index;
    const values = [
      index + 1,
      displayStationName(row.stationName),
      row.stationCode,
      row.arrivalsLine,
      row.departuresLine,
      row.asylumLine ?? "",
    ];
    values.forEach((v, col) => {
      const cell = sheet.getCell(r, col + 1);
      cell.value = v;
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      if (col >= 3) cell.alignment = { wrapText: true, vertical: "top" };
    });
  });

  sheet.columns = [
    { width: 6 },
    { width: 28 },
    { width: 10 },
    { width: 52 },
    { width: 52 },
    { width: 18 },
  ];

  sheet.views = [{ state: "frozen", ySplit: headerRow }];

  return workbook;
}
