import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-helpers";
import { PERMISSIONS } from "@/lib/rbac";
import { ReportStatus, MovementType } from "@prisma/client";
import { parseReportDate } from "@/lib/utils";

export async function GET(request: Request) {
  const user = await requirePermission(PERMISSIONS.WEEKLY_EXPORT);
  if (user instanceof NextResponse) return user;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json(
      { error: "from and to dates required (YYYY-MM-DD)" },
      { status: 400 },
    );
  }

  const fromDate = parseReportDate(from);
  const toDate = parseReportDate(to);

  const stations = await prisma.borderStation.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  const reports = await prisma.stationDailyReport.findMany({
    where: {
      reportDate: { gte: fromDate, lte: toDate },
      status: ReportStatus.approved,
    },
    include: { movements: true, station: true },
  });

  const dates: string[] = [];
  for (let d = new Date(fromDate); d <= toDate; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }

  const arrivalTotals = new Map<string, number>();
  for (const r of reports) {
    const key = `${r.stationId}:${r.reportDate.toISOString().slice(0, 10)}`;
    const total = r.movements
      .filter((m) => m.movementType === MovementType.arrival)
      .reduce((s, m) => s + m.male + m.female, 0);
    arrivalTotals.set(key, total);
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Weekly Arrivals");
  sheet.addRow(["Station", "Code", ...dates, "Week Total"]);

  let grandTotal = 0;
  for (const station of stations) {
    let rowTotal = 0;
    const row: (string | number)[] = [station.name, station.code];
    for (const date of dates) {
      const key = `${station.id}:${date}`;
      const val = arrivalTotals.get(key) ?? 0;
      row.push(val);
      rowTotal += val;
    }
    row.push(rowTotal);
    grandTotal += rowTotal;
    sheet.addRow(row);
  }

  sheet.addRow([]);
  const footer = ["GRAND TOTAL", "", ...dates.map(() => ""), grandTotal];
  sheet.addRow(footer);

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="weekly-sitrep-${from}-${to}.xlsx"`,
    },
  });
}
