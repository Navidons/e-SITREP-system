"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { LoadingBlock, LoadingOverlay } from "@/components/ui/loading";
import { Field, inputClassName } from "@/components/ui/field";
import { formatDateInput } from "@/lib/utils";

function displayStationName(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
import type { StationConsolidatedTableRow } from "@/lib/reports/consolidated-formatter";

type GenerateResponse = {
  date: string;
  stationCount: number;
  consolidated: string;
  tableRows: StationConsolidatedTableRow[];
};

export function ConsolidatedClient() {
  const [date, setDate] = useState(() => formatDateInput(new Date()));
  const [text, setText] = useState("");
  const [rows, setRows] = useState<StationConsolidatedTableRow[]>([]);
  const [stationCount, setStationCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    const res = await fetch(
      `/api/reports/generate/consolidated?date=${date}`,
      { method: "POST" },
    );
    const data = (await res.json()) as GenerateResponse & { error?: string };
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Generation failed");
      setText("");
      setRows([]);
      return;
    }
    setText(data.consolidated);
    setRows(data.tableRows ?? []);
    setStationCount(data.stationCount);
  }

  async function downloadExcel() {
    setDownloading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/exports/consolidated?date=${encodeURIComponent(date)}`,
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
        `CONSOLIDATED DAILY SITREP ${date}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Could not download file.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <Field label="Report date">
          <input
            type="date"
            className={inputClassName}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <Button type="button" onClick={generate} loading={loading}>
          Load consolidated SITREP
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={downloadExcel}
          loading={downloading}
        >
          Download Excel table
        </Button>
      </div>

      {error && (
        <Alert variant="error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading && rows.length === 0 && (
        <LoadingBlock message="Loading approved reports for this date…" />
      )}

      {rows.length > 0 && (
        <div className="relative overflow-hidden rounded-lg border bg-white shadow-sm">
          {loading && <LoadingOverlay message="Refreshing…" />}
          <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-2">
            <p className="text-sm font-semibold text-zinc-900">
              Consolidated table — {date}
            </p>
            <p className="text-xs text-zinc-600">
              {stationCount} approved station{stationCount !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-zinc-100 text-left">
                <tr>
                  <th className="p-3 w-12">S/N</th>
                  <th className="p-3">Entry / exit point</th>
                  <th className="p-3 w-16">Code</th>
                  <th className="p-3 min-w-[200px]">Arrivals</th>
                  <th className="p-3 min-w-[200px]">Departures</th>
                  <th className="p-3 w-28">Asylum</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.stationCode} className="border-t align-top">
                    <td className="p-3 tabular-nums">{i + 1}</td>
                    <td className="p-3 font-medium">
                      {displayStationName(row.stationName)}
                    </td>
                    <td className="p-3">{row.stationCode}</td>
                    <td className="p-3 whitespace-pre-wrap">{row.arrivalsLine}</td>
                    <td className="p-3 whitespace-pre-wrap">
                      {row.departuresLine}
                    </td>
                    <td className="p-3">{row.asylumLine ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <details className="rounded-lg border bg-white shadow-sm">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-zinc-900">
          Full text block (HQ format)
        </summary>
        <pre className="overflow-auto border-t bg-zinc-900 p-4 text-sm text-white whitespace-pre-wrap">
          {text || "Load a date to see the consolidated text."}
        </pre>
      </details>
    </div>
  );
}
