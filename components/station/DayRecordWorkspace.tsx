"use client";

import { useCallback, useEffect, useState } from "react";
import { NationalitySelect } from "@/components/forms/NationalitySelect";
import { useAppPreferences } from "@/components/providers/AppPreferencesProvider";
import { Button } from "@/components/ui/button";
import { Tabs, TabPanel } from "@/components/ui/tabs";
import { DailySummaryTable } from "@/components/forms/DailySummaryTable";
import { formatDateInput } from "@/lib/utils";
import type { DayEntryPayload } from "@/types/reports";

type EntryType = DayEntryPayload["entryType"];
type WorkTabId = "entry" | "log" | "totals" | "submit";

type DailyEntryRow = {
  id: number;
  entryType: EntryType;
  nationalityCode: string | null;
  male: number;
  female: number;
  recordedAt: string;
  notes: string | null;
  enteredBy?: { fullName: string };
};

type DayData = {
  id?: number;
  reportDate: string;
  status: string;
  isToday?: boolean;
  staffOnDuty?: number;
  medicalScreening?: string;
  generalRemarks?: string;
  urgentMatters?: string;
  entries: DailyEntryRow[];
  entryCount?: number;
  summary: {
    arrivals: {
      rows: Array<{ nationalityCode: string; male: number; female: number }>;
      male: number;
      female: number;
      total: number;
    };
    departures: {
      rows: Array<{ nationalityCode: string; male: number; female: number }>;
      male: number;
      female: number;
      total: number;
    };
    specialCategories: Array<{ category: string; male: number; female: number }>;
  };
  station?: { name: string };
};

const ENTRY_LABELS: Record<EntryType, string> = {
  arrival: "Arrival",
  departure: "Departure",
  asylum_seeker: "Asylum seeker",
  refugee: "Refugee",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-UG", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function nowLocalDatetime() {
  const d = new Date();
  d.setSeconds(0, 0);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60_000);
  return local.toISOString().slice(0, 16);
}

export function DayRecordWorkspace({
  reportDate,
  isToday,
}: {
  reportDate: string;
  isToday: boolean;
}) {
  const { countryLabel } = useAppPreferences();
  const [workTab, setWorkTab] = useState<WorkTabId>("entry");
  const [data, setData] = useState<DayData | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [entryType, setEntryType] = useState<EntryType>("arrival");
  const [nationalityCode, setNationalityCode] = useState("");
  const [male, setMale] = useState(0);
  const [female, setFemale] = useState(0);
  const [recordedAt, setRecordedAt] = useState(nowLocalDatetime);
  const [notes, setNotes] = useState("");

  const [staffOnDuty, setStaffOnDuty] = useState(0);
  const [medicalScreening, setMedicalScreening] = useState("");
  const [generalRemarks, setGeneralRemarks] = useState("");
  const [urgentMatters, setUrgentMatters] = useState("");

  const readOnly =
    data?.status !== undefined &&
    data.status !== "draft" &&
    data.status !== "rejected";

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/reports/daily?date=${reportDate}`);
    const json = await res.json();
    setLoading(false);
    setData(json);
    setStaffOnDuty(json.staffOnDuty ?? 0);
    setMedicalScreening(json.medicalScreening ?? "");
    setGeneralRemarks(json.generalRemarks ?? "");
    setUrgentMatters(json.urgentMatters ?? "");
  }, [reportDate]);

  useEffect(() => {
    load();
    setWorkTab("entry");
  }, [load]);

  function entryLabel(e: DailyEntryRow) {
    const type = ENTRY_LABELS[e.entryType];
    if (e.entryType === "arrival" || e.entryType === "departure") {
      return `${type} — ${countryLabel(e.nationalityCode ?? "—")}`;
    }
    return e.nationalityCode
      ? `${type} — ${countryLabel(e.nationalityCode)}`
      : type;
  }

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (
      (entryType === "arrival" || entryType === "departure") &&
      !nationalityCode?.trim()
    ) {
      setMessage("Select a nationality from the list.");
      return;
    }
    const res = await fetch("/api/reports/daily/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportDate,
        entryType,
        nationalityCode:
          entryType === "arrival" || entryType === "departure"
            ? nationalityCode
            : nationalityCode || undefined,
        male,
        female,
        recordedAt: new Date(recordedAt).toISOString(),
        notes: notes || undefined,
      } satisfies DayEntryPayload),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error ?? "Could not save entry");
      return;
    }
    setData(json);
    setMale(0);
    setFemale(0);
    setNationalityCode("");
    setNotes("");
    setRecordedAt(nowLocalDatetime());
    setMessage(`${ENTRY_LABELS[entryType]} saved for ${reportDate}.`);
    setWorkTab("log");
  }

  async function removeEntry(entryId: number) {
    if (!confirm("Remove this entry?")) return;
    const res = await fetch(
      `/api/reports/daily/entries/${entryId}?date=${reportDate}`,
      { method: "DELETE" },
    );
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error ?? "Delete failed");
      return;
    }
    setData(json);
    setMessage("Entry removed.");
  }

  async function saveRemarks() {
    const res = await fetch("/api/reports/daily", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportDate,
        staffOnDuty,
        medicalScreening,
        generalRemarks,
        urgentMatters,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error ?? "Save failed");
      return;
    }
    setData(json);
    setMessage("Remarks saved.");
  }

  async function submitDay() {
    if (!data?.id) {
      setMessage("Add at least one entry before submitting.");
      setWorkTab("entry");
      return;
    }
    const res = await fetch(`/api/reports/${data.id}/submit`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error ?? "Submit failed");
      return;
    }
    await load();
    setMessage(`Day report for ${reportDate} submitted to HQ.`);
  }

  const entryCount = data?.entries?.length ?? 0;
  const workTabs = [
    { id: "entry" as const, label: "New entry" },
    { id: "log" as const, label: "Entry log", badge: entryCount },
    { id: "totals" as const, label: "Day totals" },
    { id: "submit" as const, label: "Submit day" },
  ];

  const sortedEntries = [...(data?.entries ?? [])].sort(
    (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-300 bg-white px-4 py-3 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
            {isToday ? "Today’s record" : "Past day record"}
          </p>
          <p className="text-lg font-bold text-zinc-900">{reportDate}</p>
          <p className="text-sm font-medium text-zinc-700">
            {data?.station?.name ?? "Station"} ·{" "}
            <span className="uppercase text-emerald-800">
              {data?.status ?? "draft"}
            </span>
          </p>
        </div>
        {loading && (
          <span className="text-sm font-medium text-zinc-600">Loading…</span>
        )}
      </div>

      {message && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-950">
          {message}
        </p>
      )}

      <div className="rounded-lg border border-zinc-300 shadow-sm">
        <Tabs tabs={workTabs} active={workTab} onChange={(id) => setWorkTab(id as WorkTabId)} />

        {workTab === "entry" && (
          <TabPanel className="overflow-visible">
            {readOnly ? (
              <p className="text-sm font-medium text-zinc-700">
                This day is locked. View totals in other tabs.
              </p>
            ) : (
              <form onSubmit={addEntry} className="space-y-4">
                <p className="text-sm text-zinc-700">
                  Each save adds a new batch to <strong>{reportDate}</strong> only.
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(Object.keys(ENTRY_LABELS) as EntryType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setEntryType(t)}
                      className={`rounded-md border px-3 py-2.5 text-sm font-semibold ${
                        entryType === t
                          ? "border-emerald-800 bg-emerald-800 text-white"
                          : "border-zinc-300 bg-zinc-50 text-zinc-900"
                      }`}
                    >
                      {ENTRY_LABELS[t]}
                    </button>
                  ))}
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-sm font-semibold text-zinc-900">
                      Nationality
                      {entryType !== "arrival" && entryType !== "departure"
                        ? " (optional)"
                        : ""}
                    </label>
                    <NationalitySelect
                      value={nationalityCode}
                      onChange={setNationalityCode}
                      required={
                        entryType === "arrival" || entryType === "departure"
                      }
                      optional={
                        entryType !== "arrival" && entryType !== "departure"
                      }
                      disabled={readOnly}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-zinc-900">
                      Male
                    </label>
                    <input
                      type="number"
                      min={0}
                      className="w-full rounded border border-zinc-400 px-3 py-2 text-zinc-900"
                      value={male}
                      onChange={(e) => setMale(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-zinc-900">
                      Female
                    </label>
                    <input
                      type="number"
                      min={0}
                      className="w-full rounded border border-zinc-400 px-3 py-2 text-zinc-900"
                      value={female}
                      onChange={(e) =>
                        setFemale(Number(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-sm font-semibold text-zinc-900">
                      Time
                    </label>
                    <input
                      type="datetime-local"
                      className="w-full max-w-xs rounded border border-zinc-400 px-3 py-2 text-zinc-900"
                      value={recordedAt}
                      onChange={(e) => setRecordedAt(e.target.value)}
                    />
                  </div>
                </div>
                <input
                  className="w-full rounded border border-zinc-400 px-3 py-2 text-zinc-900"
                  placeholder="Note (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <Button type="submit">Save to {reportDate}</Button>
              </form>
            )}
          </TabPanel>
        )}

        {workTab === "log" && (
          <TabPanel className="p-0">
            <div className="overflow-x-auto p-4">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b bg-zinc-100 text-left">
                    <th className="p-2 font-semibold text-zinc-900">Time</th>
                    <th className="p-2 font-semibold text-zinc-900">Entry</th>
                    <th className="p-2">M</th>
                    <th className="p-2">F</th>
                    <th className="p-2">Tot</th>
                    <th className="p-2">By</th>
                    {!readOnly && <th className="p-2" />}
                  </tr>
                </thead>
                <tbody>
                  {sortedEntries.length === 0 && (
                    <tr>
                      <td
                        colSpan={readOnly ? 6 : 7}
                        className="p-6 text-center font-medium text-zinc-700"
                      >
                        No entries for {reportDate}.
                      </td>
                    </tr>
                  )}
                  {sortedEntries.map((e) => (
                    <tr key={e.id} className="border-b">
                      <td className="p-2 tabular-nums">{formatTime(e.recordedAt)}</td>
                      <td className="p-2">
                        {entryLabel(e)}
                        {e.notes && (
                          <span className="block text-xs text-zinc-600">
                            {e.notes}
                          </span>
                        )}
                      </td>
                      <td className="p-2 tabular-nums">{e.male}</td>
                      <td className="p-2 tabular-nums">{e.female}</td>
                      <td className="p-2 tabular-nums font-medium">
                        {e.male + e.female}
                      </td>
                      <td className="p-2 text-zinc-800">
                        {e.enteredBy?.fullName ?? "—"}
                      </td>
                      {!readOnly && (
                        <td className="p-2">
                          <button
                            type="button"
                            className="text-xs font-semibold text-red-700"
                            onClick={() => removeEntry(e.id)}
                          >
                            Remove
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabPanel>
        )}

        {workTab === "totals" && data?.summary && (
          <TabPanel className="border-0 bg-transparent p-0 shadow-none">
            <DailySummaryTable
              stationName={data.station?.name ?? "Station"}
              reportDate={reportDate}
              arrivals={data.summary.arrivals}
              departures={data.summary.departures}
              specialCategories={data.summary.specialCategories}
            />
          </TabPanel>
        )}

        {workTab === "submit" && (
          <TabPanel>
            <div className="space-y-4">
              <p className="text-sm text-zinc-700">
                Close <strong>{reportDate}</strong> when all batches are logged (
                {entryCount} entries).
              </p>
              <label className="block text-sm">
                <span className="font-semibold text-zinc-900">Staff on duty</span>
                <input
                  type="number"
                  min={0}
                  readOnly={readOnly}
                  className="mt-1 w-full max-w-xs rounded border border-zinc-400 px-3 py-2 text-zinc-900"
                  value={staffOnDuty}
                  onChange={(e) =>
                    setStaffOnDuty(Number(e.target.value) || 0)
                  }
                />
              </label>
              <label className="block text-sm">
                <span className="font-semibold text-zinc-900">
                  Medical screening
                </span>
                <textarea
                  readOnly={readOnly}
                  className="mt-1 w-full rounded border border-zinc-400 px-3 py-2 text-zinc-900"
                  rows={2}
                  value={medicalScreening}
                  onChange={(e) => setMedicalScreening(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                <span className="font-semibold text-zinc-900">
                  General remarks
                </span>
                <textarea
                  readOnly={readOnly}
                  className="mt-1 w-full rounded border border-zinc-400 px-3 py-2 text-zinc-900"
                  rows={2}
                  value={generalRemarks}
                  onChange={(e) => setGeneralRemarks(e.target.value)}
                />
              </label>
              {!readOnly && (
                <div className="flex flex-wrap gap-3">
                  <Button type="button" variant="secondary" onClick={saveRemarks}>
                    Save remarks
                  </Button>
                  <Button type="button" onClick={submitDay}>
                    Submit {reportDate} to HQ
                  </Button>
                </div>
              )}
            </div>
          </TabPanel>
        )}
      </div>
    </div>
  );
}
