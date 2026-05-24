import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth-helpers";
import { PERMISSIONS } from "@/lib/rbac";
import { buildConsolidatedSitrepWorkbook } from "@/lib/exports/consolidated-table";
import { loadConsolidatedForDate } from "@/lib/reports/consolidated-load";

export async function GET(request: Request) {
  const user = await requirePermission(
    PERMISSIONS.REPORT_GENERATE_CONSOLIDATED,
  );
  if (user instanceof NextResponse) return user;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "date is required" }, { status: 400 });
  }

  const data = await loadConsolidatedForDate(date);
  const workbook = await buildConsolidatedSitrepWorkbook({
    date,
    rows: data.tableRows,
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `CONSOLIDATED DAILY SITREP ${date}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
