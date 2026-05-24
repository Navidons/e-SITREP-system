"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatDateInput } from "@/lib/utils";
import { Calendar, Download, AlertCircle, CheckCircle } from "lucide-react";

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

  const handleFromChange = (newFrom: string) => {
    setFrom(newFrom);
    if (newFrom) {
      setTo(addDays(newFrom, 6));
    }
  };

  const handleToChange = (newTo: string) => {
    setTo(newTo);
    if (newTo) {
      setFrom(addDays(newTo, -6));
    }
  };

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
      setError("Could not download file. Please check your network connection and try again.");
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
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-md transition-all duration-200 hover:shadow-lg">
        {/* Top Accent Bar */}
        <div className="h-1.5 bg-gradient-to-r from-emerald-800 to-teal-600" />
        
        <div className="p-6 space-y-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900">
                Weekly statistics matrix
              </h2>
              <p className="mt-1 text-sm text-zinc-600 leading-relaxed">
                Exports an Excel workbook matching the NCIC weekly layout: stations
                as rows, each day with <strong>Arrivals</strong> and{" "}
                <strong>Departures</strong> columns, plus weekly and grand totals.
                Land posts use nationality movements; Entebbe uses flight passenger
                totals. Only <strong>approved</strong> daily reports are included.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 pt-1">
            <Button
              type="button"
              variant="secondary"
              className="rounded-lg shadow-sm hover:border-emerald-600 hover:text-emerald-900 transition-all duration-150 text-xs font-semibold"
              onClick={useReferenceWeek}
            >
              Reference week (2–8 May 2026)
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="rounded-lg shadow-sm hover:border-emerald-600 hover:text-emerald-900 transition-all duration-150 text-xs font-semibold"
              onClick={useLastSevenDays}
            >
              Last 7 days
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 bg-zinc-50 p-4 rounded-xl border border-zinc-150">
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600">
              <span>From (Start Date)</span>
              <input
                type="date"
                required
                className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-950 shadow-sm transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none"
                value={from}
                onChange={(e) => handleFromChange(e.target.value)}
              />
            </label>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600">
              <span>To (End Date)</span>
              <input
                type="date"
                required
                className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-950 shadow-sm transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none"
                value={to}
                onChange={(e) => handleToChange(e.target.value)}
              />
            </label>
          </div>

          {dayCount === 7 ? (
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50/70 border border-emerald-100 rounded-lg px-3.5 py-2.5">
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>
                Exactly 7 days selected: {from} to {to}. Ready to export.
              </span>
            </div>
          ) : dayCount > 0 ? (
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 bg-amber-50/70 border border-amber-100 rounded-lg px-3.5 py-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>
                {dayCount} day{dayCount !== 1 ? "s" : ""} selected.
              </span>
            </div>
          ) : null}

          {error && (
            <div className="flex gap-2.5 rounded-lg border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-900">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
              <div className="space-y-0.5">
                <p className="font-bold">Export failed</p>
                <p className="text-xs text-red-800 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          <Button
            type="button"
            className="w-full sm:w-auto rounded-lg font-bold py-2.5 px-6 shadow-sm active:scale-[0.98] transition-all bg-emerald-800 text-white hover:bg-emerald-900 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            onClick={download}
            disabled={downloading || dayCount < 1 || dayCount > 31}
          >
            <Download className="h-4 w-4" />
            {downloading ? "Generating Matrix…" : "Download Weekly Excel"}
          </Button>
        </div>
      </div>

      <p className="text-xs text-zinc-500 text-center font-medium">
        Reference: instructions/support-files/WEEKLY STATISTICS 02.08 MAY 2026.xlsx
      </p>
    </div>
  );
}
