"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatDateInput } from "@/lib/utils";

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return formatDateInput(d);
}

/** Layout reference in instructions/support-files */
const REFERENCE_WEEK_FROM = "2026-05-02";
const REFERENCE_WEEK_TO = "2026-05-08";

export function WeeklyExportClient() {
  const [from, setFrom] = useState(() => {
    const end = formatDateInput(new Date());
    return addDays(end, -6);
  });
  const [to, setTo] = useState(() => formatDateInput(new Date()));
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dayCount = useMemo(() => {
    const a = new Date(`${from}T00:00:00.000Z`).getTime();
    const b = new Date(`${to}T00:00:00.000Z`).getTime();
    if (b < a) return 0;
    return Math.floor((b - a) / 86_400_000) + 1;
  }, [from, to]);

  async function download() {
    setError(null);
    setDownloading(true);
    try {
      const res = await fetch(
        `/api/exports/weekly?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "Export failed");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ??
        `WEEKLY STATISTICS ${from} to ${to}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Could not download file.");
    } finally {
      setDownloading(false);
    }
  }

  function useReferenceWeek() {
    setFrom(REFERENCE_WEEK_FROM);
    setTo(REFERENCE_WEEK_TO);
  }

  function useLastSevenDays() {
    const end = formatDateInput(new Date());
    setTo(end);
    setFrom(addDays(end, -6));
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-lg border border-zinc-300 bg-white p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">
            Weekly statistics matrix
          </h2>
          <p className="mt-1 text-sm text-zinc-700">
            Exports an Excel workbook matching the NCIC weekly layout: stations
            as rows, each day with <strong>Arrivals</strong> and{" "}
            <strong>Departures</strong> columns, plus weekly and grand totals.
            Land posts use nationality movements; Entebbe uses flight passenger
            totals. Only <strong>approved</strong> daily reports are included.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={useReferenceWeek}>
            Reference week (2–8 May 2026)
          </Button>
          <Button type="button" variant="secondary" onClick={useLastSevenDays}>
            Last 7 days
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-semibold text-zinc-900">From</span>
            <input
              type="date"
              className="mt-1 block w-full rounded border border-zinc-400 px-3 py-2 text-zinc-900"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="font-semibold text-zinc-900">To</span>
            <input
              type="date"
              className="mt-1 block w-full rounded border border-zinc-400 px-3 py-2 text-zinc-900"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
        </div>

        {dayCount > 0 && (
          <p className="text-sm text-zinc-600">
            {dayCount} day{dayCount !== 1 ? "s" : ""} × all active stations × 2
            (arrivals + departures) = {dayCount * 2} movement columns, plus
            weekly totals.
          </p>
        )}

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}

        <Button
          type="button"
          onClick={download}
          disabled={downloading || dayCount < 1 || dayCount > 31}
        >
          {downloading ? "Generating…" : "Download weekly Excel"}
        </Button>
      </div>

      <p className="text-xs text-zinc-500">
        Reference: instructions/support-files/WEEKLY STATISTICS 02.08 MAY 2026.xlsx
      </p>
    </div>
  );
}
