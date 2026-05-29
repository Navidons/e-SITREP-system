"use client";

import { useCallback, useEffect, useState } from "react";
import { StatCard } from "@/components/dashboard/StatCard";
import { Spinner } from "@/components/ui/spinner";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { Users, Building2, FileCheck, AlertTriangle, Activity, RefreshCw, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

type AuditPoint = { date: string; count: number };

type RecentReport = {
  id: number;
  stationName: string;
  reportDate: string;
  submittedBy: string;
  submissionTime: string | null;
};

type Data = {
  activeUsers: number;
  stationCount: number;
  reportsThisWeek: number;
  submittedThisWeek: number;
  pendingAmendments: number;
  auditActivity: AuditPoint[];
  recentReports: RecentReport[];
};

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function AdminDashboardClient() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analytics?scope=admin");
      if (!res.ok) throw new Error("Failed to load analytics");
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-zinc-900">System Overview</h2>
          <p className="mt-0.5 text-sm font-medium text-zinc-500">
            Admin — Last 7 days •{" "}
            {new Date().toLocaleDateString("en-UG", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <button
          onClick={load}
          className="rounded-lg border border-zinc-200 bg-white p-2 text-zinc-500 shadow-sm hover:text-emerald-800 transition-colors"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
          ⚠ {error}
        </div>
      )}

      {/* Pending amendments alert */}
      {!loading && data && data.pendingAmendments > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          {data.pendingAmendments} pending amendment request{data.pendingAmendments !== 1 ? "s" : ""} require attention.
        </div>
      )}

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active users"
          value={data?.activeUsers ?? "—"}
          icon={Users}
          accent="emerald"
        />
        <StatCard
          label="Border stations"
          value={data?.stationCount ?? "—"}
          icon={Building2}
          accent="blue"
        />
        <StatCard
          label="Reports this week"
          value={data?.reportsThisWeek ?? "—"}
          sub={`${data?.submittedThisWeek ?? 0} submitted`}
          icon={FileCheck}
          accent="violet"
        />
        <StatCard
          label="Pending amendments"
          value={data?.pendingAmendments ?? "—"}
          icon={AlertTriangle}
          accent={data?.pendingAmendments ? "amber" : "emerald"}
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Audit activity chart */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-zinc-500">
            Audit Log Activity — Last 7 Days
          </h3>
          {loading ? (
            <div className="flex h-52 flex-col items-center justify-center gap-2">
              <Spinner />
              <p className="text-sm font-semibold text-zinc-400">Loading charts…</p>
            </div>
          ) : data ? (
            <TrendChart
              labels={data.auditActivity.map((a) => a.date)}
              series={[
                { key: "count", label: "Audit events", color: "#7c3aed", fillColor: "#7c3aed" },
              ]}
              data={{ count: data.auditActivity.map((a) => a.count) }}
              height={220}
            />
          ) : null}
        </div>

        {/* System health summary */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-zinc-500">
            System Health
          </h3>
          <div className="space-y-3">
            {[
              {
                label: "Active users",
                value: data?.activeUsers,
                max: 100,
                color: "bg-emerald-500",
              },
              {
                label: "Reports submitted",
                value: data?.submittedThisWeek,
                max: data?.reportsThisWeek || 1,
                color: "bg-blue-500",
              },
              {
                label: "Pending amendments",
                value: data?.pendingAmendments,
                max: 10,
                color: "bg-amber-500",
                invert: true,
              },
            ].map((item) => (
              <div key={item.label}>
                <div className="mb-1 flex justify-between text-xs font-bold">
                  <span className="text-zinc-600">{item.label}</span>
                  <span className="text-zinc-900">{item.value ?? "—"}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className={cn("h-full rounded-full transition-all", item.color)}
                    style={{
                      width: `${Math.min(100, ((item.value ?? 0) / (item.max || 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 border-t border-zinc-100 pt-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
              <Activity className="h-3.5 w-3.5 text-emerald-600" />
              System operational
            </div>
          </div>
        </div>
      </div>

      {/* Recent submissions */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500">
            Recent Submissions
          </h3>
          <Link
            href="/hq/inbox"
            className="text-xs font-bold text-emerald-800 hover:underline"
          >
            View all →
          </Link>
        </div>
        {loading ? (
          <div className="flex flex-col items-center gap-2 p-6">
            <Spinner />
            <p className="text-sm font-semibold text-zinc-400">Loading submissions…</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 text-left">
                <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-500">Station</th>
                <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-500">Date</th>
                <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-500">Submitted by</th>
                <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-500">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {(data?.recentReports ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-zinc-400 font-semibold">
                    No recent submissions
                  </td>
                </tr>
              ) : (
                (data?.recentReports ?? []).map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-50/60 transition">
                    <td className="px-4 py-3 font-semibold text-zinc-900">{r.stationName}</td>
                    <td className="px-4 py-3 tabular-nums text-zinc-700">{r.reportDate}</td>
                    <td className="px-4 py-3 text-zinc-700">{r.submittedBy}</td>
                    <td className="px-4 py-3 text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {timeAgo(r.submissionTime)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
