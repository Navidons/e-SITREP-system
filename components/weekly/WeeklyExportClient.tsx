"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Field, inputClassName } from "@/components/ui/field";
import { useWeekDateRange } from "@/hooks/useWeekDateRange";
import { ApiError } from "@/lib/client/fetch-json";
import { formatDateInput } from "@/lib/utils";

/** NCIC reference workbook — 7 days (2–8 May 2026). */
const REFERENCE_WEEK = { from: "2026-05-02", to: "2026-05-08" };

export function WeeklyExportClient() {
  const {
    from,
    to,
    setFrom,
    setTo,
    setWeek,
    dayCount,
    isSevenDayWeek,
    weekDayCount,
  } = useWeekDateRange();
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setError(null);
    if (!isSevenDayWeek) {
      setError(`Select exactly ${weekDayCount} consecutive days (one reporting week).`);
      return;
    }
    setDownloading(true);
    try {
      const res = await fetch(
        `/api/exports/weekly?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new ApiError(
          typeof json.error === "string" ? json.error : "Export failed",
          res.status,
          json,
        );
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
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Could not download file.",
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="card space-y-4 p-6">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">
            Weekly statistics matrix
          </h2>
          <p className="mt-1 text-sm text-zinc-700">
            Exports an Excel workbook matching the NCIC weekly layout: one{" "}
            <strong>{weekDayCount}-day</strong> week, stations as rows, each day
            with arrivals and departures, plus weekly totals. Only{" "}
            <strong>approved</strong> reports are included.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setWeek(REFERENCE_WEEK)}
          >
            Reference week (2–8 May 2026)
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setTo(formatDateInput(new Date()))}
          >
            End today (7-day week)
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Week starts"
            hint="Changing start adjusts end to keep 7 days"
          >
            <input
              type="date"
              className={inputClassName}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </Field>
          <Field
            label="Week ends"
            hint="Changing end adjusts start to keep 7 days"
          >
            <input
              type="date"
              className={inputClassName}
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </Field>
        </div>

        <p className="text-sm text-zinc-600">
          <span className="font-medium text-zinc-800">
            {dayCount} day{dayCount !== 1 ? "s" : ""}
          </span>
          {isSevenDayWeek
            ? ` · ${dayCount * 2} movement columns + weekly totals`
            : ` · expected ${weekDayCount} days for a full week`}
        </p>

        {error && (
          <Alert variant="error" onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Button
          type="button"
          onClick={download}
          disabled={downloading || !isSevenDayWeek}
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
