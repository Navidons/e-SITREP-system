"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export type DayListItem = {
  reportDate: string;
  status: string;
  entryCount: number;
  id: number;
};

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const STATUS_STYLES: Record<string, string> = {
  draft: "text-amber-800",
  submitted: "text-blue-800",
  reviewed: "text-indigo-800",
  verified: "text-violet-800",
  approved: "text-emerald-800",
  rejected: "text-red-800",
};

type Props = {
  today: string;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  active: boolean;
};

function listQueryString(params: Record<string, string | number | undefined>) {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") q.set(key, String(value));
  }
  return q.toString();
}

export function PreviousDaysPanel({
  today,
  selectedDate,
  onSelectDate,
  active,
}: Props) {
  const [years, setYears] = useState<number[]>([]);
  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [days, setDays] = useState<DayListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [monthCounts, setMonthCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jumpDate, setJumpDate] = useState("");
  const [countsReady, setCountsReady] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);

  const loadMeta = useCallback(async () => {
    const res = await fetch("/api/reports/daily/list?meta=1");
    if (!res.ok) throw new Error("Could not load year list");
    const json = await res.json();
    const y: number[] = json.years ?? [];
    setYears(y);
    if (y.length > 0) {
      setYear((current) => current ?? y[0]);
    }
    return y;
  }, []);

  const fetchPage = useCallback(
    async (opts: {
      append: boolean;
      cursor?: string;
      yearValue: number;
      monthValue: number | null;
    }) => {
      const id = ++requestId.current;
      const qs = listQueryString({
        limit: 25,
        year: opts.yearValue,
        month: opts.monthValue ?? undefined,
        cursor: opts.cursor,
        excludeToday: 1,
      });
      const res = await fetch(`/api/reports/daily/list?${qs}`);
      if (!res.ok) throw new Error("Could not load days");
      const json = await res.json();
      if (id !== requestId.current) return;

      setTotal(json.total ?? 0);
      setNextCursor(json.nextCursor ?? null);
      if (json.monthCounts) {
        setMonthCounts(json.monthCounts);
        setCountsReady(true);
      }
      setDays((prev) =>
        opts.append ? [...prev, ...(json.days ?? [])] : (json.days ?? []),
      );
    },
    [],
  );

  const resetAndLoad = useCallback(
    async (yearValue: number, monthValue: number | null) => {
      setLoading(true);
      setError(null);
      setDays([]);
      setNextCursor(null);
      if (monthValue === null) setCountsReady(false);
      try {
        await fetchPage({
          append: false,
          yearValue,
          monthValue,
        });
      } catch {
        setError("Failed to load records. Try again.");
      } finally {
        setLoading(false);
      }
    },
    [fetchPage],
  );

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    loadMeta().catch(() => {
      if (!cancelled) setError("Failed to load history.");
    });
    return () => {
      cancelled = true;
      requestId.current++;
    };
  }, [active, loadMeta]);

  useEffect(() => {
    if (!active || year === null) return;
    resetAndLoad(year, month);
  }, [active, year, month, resetAndLoad]);

  const shownLabel = useMemo(() => {
    if (year === null) return "";
    if (month) return `${MONTH_LABELS[month - 1]} ${year}`;
    return String(year);
  }, [year, month]);

  async function loadMore() {
    if (!nextCursor || year === null || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      await fetchPage({
        append: true,
        cursor: nextCursor,
        yearValue: year,
        monthValue: month,
      });
    } catch {
      setError("Could not load more days.");
    } finally {
      setLoadingMore(false);
    }
  }

  function handleJump() {
    if (!jumpDate || jumpDate >= today) return;
    onSelectDate(jumpDate);
    const y = Number(jumpDate.slice(0, 4));
    const m = Number(jumpDate.slice(5, 7));
    if (years.includes(y)) {
      setYear(y);
      setMonth(m);
    }
    const el = listRef.current?.querySelector(
      `[data-date="${jumpDate}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }

  if (!active) return null;

  return (
    <div className="flex min-h-0 flex-col border-t border-zinc-200">
      <div className="shrink-0 space-y-2 border-b border-zinc-100 p-2">
        <label className="block px-1">
          <span className="text-xs font-semibold uppercase text-zinc-600">
            Year
          </span>
          <select
            value={year ?? ""}
            disabled={years.length === 0 || loading}
            onChange={(e) => {
              setMonth(null);
              setYear(Number(e.target.value));
            }}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm font-medium text-zinc-900"
          >
            {years.length === 0 && (
              <option value="">No records yet</option>
            )}
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>

        {year !== null && (
          <div className="px-1">
            <span className="text-xs font-semibold uppercase text-zinc-600">
              Month
            </span>
            <div className="mt-1 flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setMonth(null)}
                className={cn(
                  "rounded px-2 py-0.5 text-xs font-semibold",
                  month === null
                    ? "bg-emerald-800 text-white"
                    : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200",
                )}
              >
                All
              </button>
              {MONTH_LABELS.map((label, i) => {
                const m = i + 1;
                const count = monthCounts[m] ?? 0;
                return (
                  <button
                    key={label}
                    type="button"
                    title={
                      count > 0
                        ? `${count} day${count === 1 ? "" : "s"}`
                        : "No records"
                    }
                    disabled={
                      countsReady && count === 0 && month !== m
                    }
                    onClick={() => setMonth(m)}
                    className={cn(
                      "rounded px-1.5 py-0.5 text-xs font-medium",
                      month === m
                        ? "bg-emerald-800 text-white"
                        : count > 0
                          ? "bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
                          : "bg-zinc-50 text-zinc-400",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex gap-1 px-1">
          <input
            type="date"
            max={today}
            value={jumpDate}
            onChange={(e) => setJumpDate(e.target.value)}
            className="min-w-0 flex-1 rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-900"
            aria-label="Jump to date"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!jumpDate || jumpDate >= today}
            onClick={handleJump}
          >
            Go
          </Button>
        </div>

        {total > 0 && (
          <p className="px-1 text-xs text-zinc-600">
            {days.length} of {total} in {shownLabel}
          </p>
        )}
      </div>

      <div
        ref={listRef}
        className="min-h-0 max-h-[min(55vh,24rem)] flex-1 overflow-y-auto scroll-pb-4 p-2"
      >
        {error && (
          <p className="px-2 py-2 text-xs font-medium text-red-700">{error}</p>
        )}
        {loading && days.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-2 py-8 text-center">
            <Spinner size="sm" />
            <p className="text-xs text-zinc-600">Loading days…</p>
          </div>
        )}
        {years.length === 0 && !loading && (
          <p className="px-2 py-4 text-xs text-zinc-600">
            No previous days yet. Completed days appear here after you
            start recording.
          </p>
        )}
        {years.length > 0 && !loading && days.length === 0 && !error && (
          <p className="px-2 py-4 text-xs text-zinc-600">
            No records for this period.
          </p>
        )}
        {days.map((d) => (
          <button
            key={d.reportDate}
            type="button"
            data-date={d.reportDate}
            onClick={() => onSelectDate(d.reportDate)}
            className={cn(
              "mb-1 w-full rounded px-2 py-2 text-left text-xs",
              selectedDate === d.reportDate
                ? "bg-emerald-100 font-semibold text-emerald-900"
                : "text-zinc-800 hover:bg-zinc-50",
            )}
          >
            <span className="font-semibold">{d.reportDate}</span>
            <span
              className={cn(
                "block uppercase",
                STATUS_STYLES[d.status] ?? "text-zinc-600",
              )}
            >
              {d.status} · {d.entryCount} entries
            </span>
          </button>
        ))}
        {nextCursor && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-1 w-full"
            disabled={loadingMore}
            onClick={loadMore}
          >
            {loadingMore ? (
              <span className="inline-flex items-center gap-2">
                <Spinner size="sm" />
                Loading…
              </span>
            ) : (
              "Load more"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
