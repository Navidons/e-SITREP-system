import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { isHqUser, isSystemAdmin } from "@/lib/rbac";
import { subDays, format, startOfDay, endOfDay } from "date-fns";

function dateRange(days: number) {
  const today = new Date();
  return Array.from({ length: days }, (_, i) => {
    const d = subDays(today, days - 1 - i);
    return {
      date: format(d, "yyyy-MM-dd"),
      label: format(d, "EEE dd"),
      start: startOfDay(d),
      end: endOfDay(d),
    };
  });
}

export async function GET(request: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope") ?? "station";
  const days = Math.min(Number(searchParams.get("days") ?? "7"), 30);

  // -- STATION scope --
  if (scope === "station") {
    const stationId = user.stationId;
    if (!stationId) {
      return NextResponse.json({ error: "No station assigned" }, { status: 403 });
    }

    const range = dateRange(days);
    const today = format(new Date(), "yyyy-MM-dd");

    // Fetch reports for this station across the date range
    const reports = await prisma.stationDailyReport.findMany({
      where: {
        stationId,
        reportDate: {
          gte: range[0].start,
          lte: range[range.length - 1].end,
        },
      },
      include: {
        entries: true,
        station: { select: { name: true, reportingProfile: true } },
      },
    });

    const station = reports[0]?.station ?? await prisma.borderStation.findUnique({
      where: { id: stationId },
      select: { name: true, reportingProfile: true },
    });

    const todayReport = reports.find((r) => format(new Date(r.reportDate), "yyyy-MM-dd") === today);

    // Count today's movements
    const todayArrivals = todayReport?.entries
      .filter((e) => e.entryType === "arrival" || e.entryType === "flight_arrival")
      .reduce((s, e) => s + e.male + e.female, 0) ?? 0;

    const todayDepartures = todayReport?.entries
      .filter((e) => e.entryType === "departure" || e.entryType === "flight_departure")
      .reduce((s, e) => s + e.male + e.female, 0) ?? 0;

    const todaySpecial = todayReport?.entries
      .filter((e) => e.entryType === "asylum_seeker" || e.entryType === "refugee")
      .reduce((s, e) => s + e.male + e.female, 0) ?? 0;

    // Trend per day
    const trendArrivals = range.map((r) => {
      const rep = reports.find((rpt) => format(new Date(rpt.reportDate), "yyyy-MM-dd") === r.date);
      return rep?.entries
        .filter((e) => e.entryType === "arrival" || e.entryType === "flight_arrival")
        .reduce((s, e) => s + e.male + e.female, 0) ?? 0;
    });

    const trendDepartures = range.map((r) => {
      const rep = reports.find((rpt) => format(new Date(rpt.reportDate), "yyyy-MM-dd") === r.date);
      return rep?.entries
        .filter((e) => e.entryType === "departure" || e.entryType === "flight_departure")
        .reduce((s, e) => s + e.male + e.female, 0) ?? 0;
    });

    // Top nationalities (all entries in range)
    const nationalityMap = new Map<string, number>();
    for (const rep of reports) {
      for (const e of rep.entries) {
        if (e.nationalityCode) {
          const k = e.nationalityCode;
          nationalityMap.set(k, (nationalityMap.get(k) ?? 0) + e.male + e.female);
        }
      }
    }
    const topNationalities = [...nationalityMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([code, total]) => ({ code, total }));

    // Submission rate (how many days in range had submitted reports)
    const submittedCount = reports.filter(
      (r) => r.status !== "draft" && r.status !== "rejected",
    ).length;
    const submissionRate = days > 0 ? Math.round((submittedCount / days) * 100) : 0;

    return NextResponse.json({
      scope: "station",
      stationName: station?.name ?? "Station",
      reportingProfile: station?.reportingProfile ?? "land",
      today,
      reportStatus: todayReport?.status ?? null,
      todayArrivals,
      todayDepartures,
      todaySpecial,
      trendArrivals,
      trendDepartures,
      trendLabels: range.map((r) => r.label),
      topNationalities,
      submissionRate,
      days,
    });
  }

  // -- HQ scope --
  if (scope === "hq") {
    if (!isHqUser(user) && !isSystemAdmin(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const range = dateRange(days);
    const today = format(new Date(), "yyyy-MM-dd");

    const allStations = await prisma.borderStation.findMany({
      where: { active: true },
      orderBy: { displayOrder: "asc" },
    });

    const reports = await prisma.stationDailyReport.findMany({
      where: {
        reportDate: {
          gte: range[0].start,
          lte: range[range.length - 1].end,
        },
      },
      include: { entries: true, station: { select: { name: true, id: true } } },
    });

    const todayReports = reports.filter(
      (r) => format(new Date(r.reportDate), "yyyy-MM-dd") === today,
    );

    const totalArrivalsToday = todayReports.reduce(
      (s, r) =>
        s + r.entries
          .filter((e) => e.entryType === "arrival" || e.entryType === "flight_arrival")
          .reduce((ss, e) => ss + e.male + e.female, 0),
      0,
    );

    const totalDeparturesToday = todayReports.reduce(
      (s, r) =>
        s + r.entries
          .filter((e) => e.entryType === "departure" || e.entryType === "flight_departure")
          .reduce((ss, e) => ss + e.male + e.female, 0),
      0,
    );

    const pendingReports = await prisma.stationDailyReport.count({
      where: { status: "submitted" },
    });

    const pendingAmendments = await prisma.dayAmendment.count({
      where: { status: "pending" },
    });

    // Station breakdown for today
    const stationBreakdown = allStations.map((st) => {
      const rep = todayReports.find((r) => r.stationId === st.id);
      const arrivals = rep?.entries
        .filter((e) => e.entryType === "arrival" || e.entryType === "flight_arrival")
        .reduce((s, e) => s + e.male + e.female, 0) ?? 0;
      const departures = rep?.entries
        .filter((e) => e.entryType === "departure" || e.entryType === "flight_departure")
        .reduce((s, e) => s + e.male + e.female, 0) ?? 0;
      return {
        id: st.id,
        name: st.name,
        arrivals,
        departures,
        status: rep?.status ?? null,
        total: arrivals + departures,
      };
    });

    // Trend
    const trendArrivals = range.map((r) =>
      reports
        .filter((rpt) => format(new Date(rpt.reportDate), "yyyy-MM-dd") === r.date)
        .reduce(
          (s, rpt) =>
            s + rpt.entries
              .filter((e) => e.entryType === "arrival" || e.entryType === "flight_arrival")
              .reduce((ss, e) => ss + e.male + e.female, 0),
          0,
        ),
    );

    const trendDepartures = range.map((r) =>
      reports
        .filter((rpt) => format(new Date(rpt.reportDate), "yyyy-MM-dd") === r.date)
        .reduce(
          (s, rpt) =>
            s + rpt.entries
              .filter((e) => e.entryType === "departure" || e.entryType === "flight_departure")
              .reduce((ss, e) => ss + e.male + e.female, 0),
          0,
        ),
    );

    // Top nationalities across all stations
    const nationalityMap = new Map<string, number>();
    for (const rep of reports) {
      for (const e of rep.entries) {
        if (e.nationalityCode) {
          const k = e.nationalityCode;
          nationalityMap.set(k, (nationalityMap.get(k) ?? 0) + e.male + e.female);
        }
      }
    }
    const topNationalities = [...nationalityMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([code, total]) => ({ code, total }));

    const totalStations = allStations.length;
    const reportedToday = todayReports.length;
    const submissionRate = totalStations > 0 ? Math.round((reportedToday / totalStations) * 100) : 0;

    return NextResponse.json({
      scope: "hq",
      today,
      totalArrivalsToday,
      totalDeparturesToday,
      pendingReports,
      pendingAmendments,
      stationBreakdown,
      trendArrivals,
      trendDepartures,
      trendLabels: range.map((r) => r.label),
      topNationalities,
      submissionRate,
      totalStations,
      reportedToday,
      days,
    });
  }

  // -- ADMIN scope --
  if (scope === "admin") {
    if (!isSystemAdmin(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const range = dateRange(7);

    const [activeUsers, stationCount, reportsThisWeek, pendingAmendments] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.borderStation.count({ where: { active: true } }),
      prisma.stationDailyReport.count({
        where: { reportDate: { gte: range[0].start } },
      }),
      prisma.dayAmendment.count({ where: { status: "pending" } }),
    ]);

    const auditActivity = await Promise.all(
      range.map(async (r) => ({
        date: r.label,
        count: await prisma.auditLog.count({
          where: { createdAt: { gte: r.start, lte: r.end } },
        }),
      })),
    );

    const submittedThisWeek = await prisma.stationDailyReport.count({
      where: {
        reportDate: { gte: range[0].start },
        status: { in: ["submitted", "reviewed", "verified", "approved"] },
      },
    });

    const recentReports = await prisma.stationDailyReport.findMany({
      where: { status: "submitted" },
      orderBy: { submissionTime: "desc" },
      take: 5,
      include: { station: { select: { name: true } }, submittedBy: { select: { fullName: true } } },
    });

    return NextResponse.json({
      scope: "admin",
      activeUsers,
      stationCount,
      reportsThisWeek,
      submittedThisWeek,
      pendingAmendments,
      auditActivity,
      recentReports: recentReports.map((r) => ({
        id: r.id,
        stationName: r.station.name,
        reportDate: format(new Date(r.reportDate), "yyyy-MM-dd"),
        submittedBy: r.submittedBy?.fullName ?? "—",
        submissionTime: r.submissionTime?.toISOString() ?? null,
      })),
    });
  }

  return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
}
