"use client";

import { useCallback, useEffect, useState } from "react";
import { StatCard } from "@/components/dashboard/StatCard";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { DonutChart } from "@/components/dashboard/DonutChart";
import { StationStatusGrid } from "@/components/dashboard/StationStatusGrid";
import {
  LogIn,
  LogOut,
  Inbox,
  CheckSquare,
  Globe,
  RefreshCw,
  LayoutGrid,
  AlertTriangle,
} from "lucide-react";
import { nationalityLabel } from "@/lib/constants/nationalities";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Range = 7 | 14 | 30;

type StationBreakdown = {
  id: number;
  name: string;
  arrivals: number;
  departures: number;
  total: number;
  status: string | null;
};

type Data = {
  today: string;
  totalArrivalsToday: number;
  totalDeparturesToday: number;
  pendingReports: number;
  pendingAmendments: number;
  stationBreakdown: StationBreakdown[];
  trendArrivals: number[];
  trendDepartures: number[];
  trendLabels: string[];
  topNationalities: { code: string; total: number }[];
  submissionRate: number;
  totalStations: number;
  reportedToday: number;
  days: number;
};

export function HqDashboardClient() {
  const [range, setRange] = useState<Range>(7);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"overview" | "stations">("overview");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics?scope=hq&days=${range}`);
      if (!res.ok) throw new Error("Failed to load analytics");
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-zinc-900">National Overview</h2>
          <p className="mt-0.5 text-sm font-medium text-zinc-500">
            {new Date().toLocaleDateString("en-UG", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex overflow-hidden rounded-lg border border-zinc-200 bg-white text-sm shadow-sm">
            <button
              onClick={() => setView("overview")}
              className={cn("flex items-center gap-1.5 px-3 py-2 font-bold transition-colors", view === "overview" ? "bg-emerald-800 text-white" : "text-zinc-600 hover:bg-zinc-50")}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Overview
            </button>
            <button
              onClick={() => setView("stations")}
              className={cn("flex items-center gap-1.5 px-3 py-2 font-bold transition-colors", view === "stations" ? "bg-emerald-800 text-white" : "text-zinc-600 hover:bg-zinc-50")}
            >
              <Globe className="h-3.5 w-3.5" /> All Stations
            </button>
          </div>
          {/* Range toggle */}
          <div className="flex overflow-hidden rounded-lg border border-zinc-200 bg-white text-sm shadow-sm">
            {([7, 14, 30] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "px-3 py-2 font-bold transition-colors",
                  range === r ? "bg-emerald-800 text-white" : "text-zinc-600 hover:bg-zinc-50",
                )}
              >
                {r}d
              </button>
            ))}
          </div>
          <button
            onClick={load}
            className="rounded-lg border border-zinc-200 bg-white p-2 text-zinc-500 shadow-sm hover:text-emerald-800 transition-colors"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
          ⚠ {error}
        </div>
      )}

      {/* Alert banners */}
      {!loading && data && (data.pendingReports > 0 || data.pendingAmendments > 0) && (
        <div className="flex flex-wrap gap-3">
          {data.pendingReports > 0 && (
            <Link
              href="/hq/inbox"
              className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-900 hover:bg-amber-100 transition-colors"
            >
              <Inbox className="h-4 w-4" />
              {data.pendingReports} report{data.pendingReports !== 1 ? "s" : ""} awaiting review →
            </Link>
          )}
          {data.pendingAmendments > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-900">
              <AlertTriangle className="h-4 w-4" />
              {data.pendingAmendments} pending amendment{data.pendingAmendments !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Arrivals today"
          value={data?.totalArrivalsToday ?? "—"}
          icon={LogIn}
          accent="emerald"
          size="md"
        />
        <StatCard
          label="Departures today"
          value={data?.totalDeparturesToday ?? "—"}
          icon={LogOut}
          accent="blue"
          size="md"
        />
        <StatCard
          label="Stations reported"
          value={data ? `${data.reportedToday} / ${data.totalStations}` : "—"}
          sub={`${data?.submissionRate ?? 0}% submission rate`}
          icon={CheckSquare}
          accent={
            (data?.submissionRate ?? 0) >= 80
              ? "emerald"
              : (data?.submissionRate ?? 0) >= 50
                ? "amber"
                : "rose"
          }
        />
        <StatCard
          label="Pending review"
          value={data?.pendingReports ?? "—"}
          sub="Reports in inbox"
          icon={Inbox}
          accent="amber"
        />
      </div>

      {/* Overview: charts */}
      <div className={cn(view !== "overview" && "hidden")}>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm lg:col-span-2">
            <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-zinc-500">
              {range}-Day National Movement Trend
            </h3>
            {loading ? (
              <div className="flex h-52 items-center justify-center">
                <p className="text-sm font-semibold text-zinc-400">Loading…</p>
              </div>
            ) : data ? (
              <TrendChart
                labels={data.trendLabels}
                series={[
                  { key: "arrivals", label: "Arrivals", color: "#059669", fillColor: "#059669" },
                  { key: "departures", label: "Departures", color: "#2563eb", fillColor: "#2563eb" },
                ]}
                data={{
                  arrivals: data.trendArrivals,
                  departures: data.trendDepartures,
                }}
                height={220}
              />
            ) : null}
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h3 className="mb-2 text-sm font-black uppercase tracking-widest text-zinc-500">
              Top Nationalities
            </h3>
            {loading ? (
              <div className="flex h-52 items-center justify-center">
                <p className="text-sm font-semibold text-zinc-400">Loading…</p>
              </div>
            ) : data ? (
              <DonutChart
                items={data.topNationalities.map((n) => ({
                  code: n.code,
                  label: nationalityLabel(n.code),
                  total: n.total,
                }))}
                size={210}
              />
            ) : null}
          </div>
        </div>

        {/* Station summary table */}
        <div className="mt-4 rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-zinc-100 px-5 py-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500">
              Today at a Glance — Top Stations
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50 text-left">
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-500">Station</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-500">Arrivals</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-500">Departures</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-500">Total</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={5} className="px-4 py-3">
                          <div className="h-4 w-full animate-pulse rounded-lg bg-zinc-100" />
                        </td>
                      </tr>
                    ))
                  : (data?.stationBreakdown ?? [])
                      .sort((a, b) => b.total - a.total)
                      .slice(0, 10)
                      .map((st) => (
                        <tr key={st.id} className="hover:bg-zinc-50/60 transition">
                          <td className="px-4 py-3 font-semibold text-zinc-900">{st.name}</td>
                          <td className="px-4 py-3 tabular-nums text-emerald-700 font-bold">{st.arrivals.toLocaleString()}</td>
                          <td className="px-4 py-3 tabular-nums text-blue-700 font-bold">{st.departures.toLocaleString()}</td>
                          <td className="px-4 py-3 tabular-nums font-black text-zinc-900">{st.total.toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "rounded-full px-2.5 py-0.5 text-xs font-bold",
                              !st.status || st.status === "draft" ? "bg-zinc-100 text-zinc-600" :
                              st.status === "submitted" ? "bg-amber-100 text-amber-800" :
                              st.status === "approved" || st.status === "verified" ? "bg-emerald-100 text-emerald-800" :
                              "bg-blue-100 text-blue-800"
                            )}>
                              {st.status ?? "Not reported"}
                            </span>
                          </td>
                        </tr>
                      ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Station grid view */}
      <div className={cn(view !== "stations" && "hidden")}>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-zinc-500">
            All Border Stations — Today
          </h3>
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <p className="text-sm font-semibold text-zinc-400">Loading stations…</p>
            </div>
          ) : data ? (
            <StationStatusGrid stations={data.stationBreakdown} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
