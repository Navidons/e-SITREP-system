import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { canAccessStation } from "@/lib/rbac";
import {
  getDayRecordMonthCounts,
  getDayRecordYears,
  listDayRecordsPaginated,
  listRejectedForStation,
  todayDateString,
} from "@/lib/reports/daily-day";

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export async function GET(request: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const { searchParams } = new URL(request.url);
  const stationIdParam = searchParams.get("stationId");
  const stationId = stationIdParam
    ? Number(stationIdParam)
    : user.stationId;

  if (!stationId || !canAccessStation(user, stationId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const today = todayDateString();

  if (searchParams.get("meta") === "1") {
    const years = await getDayRecordYears(stationId);
    const rejected = await listRejectedForStation(stationId);
    return NextResponse.json({ today, years, rejected });
  }

  const yearParam = searchParams.get("year");
  const monthParam = searchParams.get("month");
  const year = yearParam ? Number(yearParam) : undefined;
  const month = monthParam ? Number(monthParam) : undefined;
  const cursor = searchParams.get("cursor") ?? undefined;
  const limit = parsePositiveInt(searchParams.get("limit"), 25);

  const result = await listDayRecordsPaginated(stationId, {
    limit,
    cursor,
    year: year && Number.isFinite(year) ? year : undefined,
    month: month && month >= 1 && month <= 12 ? month : undefined,
    excludeDate: searchParams.get("excludeToday") === "1" ? today : undefined,
  });

  const includeMonthCounts =
    year &&
    Number.isFinite(year) &&
    !month &&
    !cursor;

  const monthCounts = includeMonthCounts
    ? await getDayRecordMonthCounts(stationId, year)
    : undefined;

  return NextResponse.json({
    today,
    ...result,
    monthCounts,
  });
}
