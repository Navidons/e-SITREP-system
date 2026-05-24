"use client";

import { useCallback, useEffect, useState } from "react";
import { StatCard } from "@/components/dashboard/StatCard";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { DonutChart } from "@/components/dashboard/DonutChart";
import {
  Users,
  LogIn,
  LogOut,
  Globe,
  Activity,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { nationalityLabel } from "@/lib/constants/nationalities";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Range = 1 | 7 | 30;

type Data = {
  stationName: string;
  reportingProfile: string;
  today: string;
  reportStatus: string | null;
  todayArrivals: number;
  todayDepartures: number;
  todaySpecial: number;
  trendArrivals: number[];
  trendDepartures: number[];
  trendLabels: string[];
  topNationalities: { code: string; total: number }[];
  submissionRate: number;
  days: number;
};

const STATUS_DISPLAY: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  draft: { label: "Draft — not yet submitted", color: "text-zinc-600 bg-zinc-100 border-zinc-200", icon: Activity },
  submitted: { label: "Submitted to HQ", color: "text-amber-800 bg-amber-50 border-amber-200", icon: CheckCircle2 },
  reviewed: { label: "Reviewed by HQ", color: "text-blue-800 bg-blue-50 border-blue-200", icon: CheckCircle2 },
  verified: { label: "Verified", color: "text-teal-800 bg-teal-50 border-teal-200", icon: CheckCircle2 },
  approved: { label: "Approved", color: "text-emerald-800 bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
  rejected: { label: "Rejected — needs correction", color: "text-rose-800 bg-rose-50 border-rose-200", icon: AlertCircle },
};

export function StationDashboardClient() {
  const [range, setRange] = useState<Range>(7);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics?scope=station&days=${range}`);
      if (!res.ok) throw new Error("Failed to load analytics");
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const statusCfg = data?.reportStatus
    ? STATUS_DISPLAY[data.reportStatus] ?? STATUS_DISPLAY["draft"]
    : null;

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-zinc-900">
            {data?.stationName ?? "Station"} Dashboard
          </h2>
          <p className="mt-0.5 text-sm font-medium text-zinc-500">
            {new Date().toLocaleDateString("en-UG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Range toggle */}
          <div className="flex overflow-hidden rounded-lg border border-zinc-200 bg-white text-sm shadow-sm">
            {([1, 7, 30] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "px-4 py-2 font-bold transition-colors",
                  range === r
                    ? "bg-emerald-800 text-white"
                    : "text-zinc-600 hover:bg-zinc-50",
                )}
              >
                {r === 1 ? "Today" : `${r}d`}
              </button>
            ))}
          </div>
          <button
            onClick={load}
            className="rounded-lg border border-zinc-200 bg-white p-2 text-zinc-500 shadow-sm hover:text-emerald-800 transition-colors"
            title="Refresh"
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

      {/* Today's status banner */}
      {statusCfg && (
        <div className={cn("flex items-center gap-3 rounded-xl border px-4 py-3", statusCfg.color)}>
          <statusCfg.icon className="h-5 w-5 shrink-0" />
          <div className="flex flex-1 flex-wrap items-center justify-between gap-2">
            <p className="font-bold">Today's report: {statusCfg.label}</p>
            <Link
              href="/station"
              className="rounded-lg bg-current/10 px-3 py-1 text-xs font-bold hover:opacity-80 transition"
            >
              Go to entry →
            </Link>
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Arrivals today"
          value={data?.todayArrivals ?? "—"}
          icon={LogIn}
          accent="emerald"
          size="md"
        />
        <StatCard
          label="Departures today"
          value={data?.todayDepartures ?? "—"}
          icon={LogOut}
          accent="blue"
          size="md"
        />
        <StatCard
          label="Special categories"
          value={data?.todaySpecial ?? "—"}
          sub="Asylum seekers & refugees"
          icon={Users}
          accent="violet"
          size="md"
        />
        <StatCard
          label={`${range}d submission rate`}
          value={`${data?.submissionRate ?? 0}%`}
          sub={`${range} day window`}
          icon={CheckCircle2}
          accent={
            (data?.submissionRate ?? 0) >= 80
              ? "emerald"
              : (data?.submissionRate ?? 0) >= 50
                ? "amber"
                : "rose"
          }
          size="md"
        />
      </div>

      {/* Charts */}
      {range > 1 && (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Trend chart — spans 2 cols */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm lg:col-span-2">
            <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-zinc-500">
              {range}-Day Movement Trend
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

          {/* Nationality donut */}
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
      )}

      {/* Globe footer */}
      <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
        <Globe className="h-3.5 w-3.5" />
        Data reflects entries recorded in this system only. Refresh to see live data.
      </div>
    </div>
  );
}
