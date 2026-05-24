"use client";

import { useCallback, useEffect, useState } from "react";
import { NATIONALITY_CODES, nationalityLabel } from "@/lib/constants/nationalities";
import { Button } from "@/components/ui/button";
import { Tabs, TabPanel } from "@/components/ui/tabs";
import { DailySummaryTable } from "@/components/forms/DailySummaryTable";
import { formatDateInput } from "@/lib/utils";
import type { DayEntryPayload } from "@/types/reports";

const DEFAULT_DATE = "2026-05-08";

type EntryType = Extract<
  DayEntryPayload["entryType"],
  "arrival" | "departure" | "asylum_seeker" | "refugee"
>;
type TabId = "entry" | "log" | "totals" | "submit";

type MovementEntry = {
  id: number;
  movementType: string;
  nationalityCode: string;
  male: number;
  female: number;
  recordedAt: string;
  notes: string | null;
  enteredBy?: { fullName: string };
};

type SpecialEntry = {
  id: number;
  category: string;
  nationalityCode: string | null;
  male: number;
  female: number;
  recordedAt: string;
  notes: string | null;
  enteredBy?: { fullName: string };
};

type DayData = {
  id?: number;
  status: string;
  staffOnDuty?: number;
  medicalScreening?: string;
  generalRemarks?: string;
  urgentMatters?: string;
  movements: MovementEntry[];
  specialCategories: SpecialEntry[];
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

export function StationDayEntry() {
  const [activeTab, setActiveTab] = useState<TabId>("entry");
  const [reportDate, setReportDate] = useState(DEFAULT_DATE);
  const [data, setData] = useState<DayData | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [entryType, setEntryType] = useState<EntryType>("arrival");
  const [nationalityCode, setNationalityCode] = useState("SSD");
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
  }, [load]);

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
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
    setNotes("");
    setRecordedAt(nowLocalDatetime());
    setMessage(`${ENTRY_LABELS[entryType]} recorded.`);
    setActiveTab("log");
  }

  async function removeEntry(id: number, kind: "movement" | "special") {
    if (!confirm("Remove this entry?")) return;
    const res = await fetch(
      `/api/reports/daily/entries/${id}?kind=${kind}&date=${reportDate}`,
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

  async function submitReport() {
    if (!data?.id) {
      setMessage("Add at least one entry before submitting.");
      setActiveTab("entry");
      return;
    }
    const res = await fetch(`/api/reports/${data.id}/submit`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error ?? "Submit failed");
      return;
    }
    await load();
    setMessage("Day report submitted to HQ.");
  }

  const needsNationality =
    entryType === "arrival" || entryType === "departure";

  const logEntries = [
    ...(data?.movements ?? []).map((m) => ({
      id: m.id,
      kind: "movement" as const,
      time: m.recordedAt,
      label: `${m.movementType === "arrival" ? "Arrival" : "Departure"} — ${nationalityLabel(m.nationalityCode)}`,
      male: m.male,
      female: m.female,
      by: m.enteredBy?.fullName,
      notes: m.notes,
    })),
    ...(data?.specialCategories ?? []).map((s) => ({
      id: s.id,
      kind: "special" as const,
      time: s.recordedAt,
      label:
        s.category === "asylum_seekers"
          ? `Asylum seeker${s.nationalityCode ? ` — ${nationalityLabel(s.nationalityCode)}` : ""}`
          : `Refugee${s.nationalityCode ? ` — ${nationalityLabel(s.nationalityCode)}` : ""}`,
      male: s.male,
      female: s.female,
      by: s.enteredBy?.fullName,
      notes: s.notes,
    })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const entryCount = logEntries.length;

  const tabs = [
    { id: "entry" as const, label: "New entry" },
    { id: "log" as const, label: "Entry log", badge: entryCount },
    { id: "totals" as const, label: "Day totals" },
    { id: "submit" as const, label: "Submit" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-lg border border-zinc-300 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <label className="mb-1 block text-sm font-semibold text-zinc-900">
              Report date
            </label>
            <input
              type="date"
              className="rounded border border-zinc-400 px-3 py-2 text-zinc-900"
              value={reportDate}
              max={formatDateInput(new Date())}
              onChange={(e) => setReportDate(e.target.value)}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-700">Station</p>
            <p className="font-bold text-zinc-900">
              {data?.station?.name ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-700">Status</p>
            <p className="font-bold uppercase text-emerald-800">
              {data?.status ?? "draft"}
            </p>
          </div>
        </div>
        {loading && (
          <p className="text-sm font-medium text-zinc-700">Loading…</p>
        )}
      </div>

      {message && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-950">
          {message}
        </p>
      )}

      <div className="overflow-hidden rounded-lg border border-zinc-300 shadow-sm">
        <Tabs
          tabs={tabs}
          active={activeTab}
          onChange={(id) => setActiveTab(id as TabId)}
        />

        <div className={activeTab !== "entry" ? "hidden" : undefined}>
          <TabPanel>
            {readOnly ? (
              <p className="text-sm font-medium text-zinc-700">
                This day is locked — report already submitted. HQ must reject
                it before you can add more entries.
              </p>
            ) : (
              <>
                <p className="text-sm text-zinc-700">
                  Record each batch as people cross — you can add more later in
                  the day.
                </p>
                <form onSubmit={addEntry} className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {(Object.keys(ENTRY_LABELS) as EntryType[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setEntryType(t)}
                        className={`rounded-md border px-3 py-2.5 text-sm font-semibold ${
                          entryType === t
                            ? "border-emerald-800 bg-emerald-800 text-white"
                            : "border-zinc-300 bg-zinc-50 text-zinc-900 hover:bg-zinc-100"
                        }`}
                      >
                        {ENTRY_LABELS[t]}
                      </button>
                    ))}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-sm font-semibold text-zinc-900">
                        {needsNationality
                          ? "Nationality"
                          : "Nationality (optional)"}
                      </label>
                      <select
                        className="w-full rounded border border-zinc-400 px-3 py-2 text-zinc-900"
                        value={nationalityCode}
                        onChange={(e) => setNationalityCode(e.target.value)}
                      >
                        {!needsNationality && <option value="">—</option>}
                        {NATIONALITY_CODES.map((n) => (
                          <option key={n.code} value={n.code}>
                            {n.label} ({n.code})
                          </option>
                        ))}
                      </select>
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
                    <div className="sm:col-span-2 lg:col-span-4">
                      <label className="mb-1 block text-sm font-semibold text-zinc-900">
                        Time recorded
                      </label>
                      <input
                        type="datetime-local"
                        className="w-full max-w-xs rounded border border-zinc-400 px-3 py-2 text-zinc-900"
                        value={recordedAt}
                        onChange={(e) => setRecordedAt(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-zinc-900">
                      Note (optional)
                    </label>
                    <input
                      className="w-full rounded border border-zinc-400 px-3 py-2 text-zinc-900"
                      placeholder="e.g. afternoon bus"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                  <Button type="submit">Save entry</Button>
                </form>
              </>
            )}
          </TabPanel>
        </div>

        <div className={activeTab !== "log" ? "hidden" : undefined}>
          <TabPanel className="p-0">
            <div className="overflow-x-auto p-4">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b bg-zinc-100 text-left">
                    <th className="p-2 font-semibold text-zinc-900">Time</th>
                    <th className="p-2 font-semibold text-zinc-900">Type</th>
                    <th className="p-2 font-semibold text-zinc-900">M</th>
                    <th className="p-2 font-semibold text-zinc-900">F</th>
                    <th className="p-2 font-semibold text-zinc-900">Total</th>
                    <th className="p-2 font-semibold text-zinc-900">By</th>
                    {!readOnly && <th className="p-2 w-16" />}
                  </tr>
                </thead>
                <tbody>
                  {logEntries.length === 0 && (
                    <tr>
                      <td
                        colSpan={readOnly ? 6 : 7}
                        className="p-6 text-center font-medium text-zinc-700"
                      >
                        No entries yet. Use the New entry tab.
                      </td>
                    </tr>
                  )}
                  {logEntries.map((e) => (
                    <tr key={`${e.kind}-${e.id}`} className="border-b">
                      <td className="p-2 tabular-nums text-zinc-900">
                        {formatTime(e.time)}
                      </td>
                      <td className="p-2 text-zinc-900">
                        {e.label}
                        {e.notes ? (
                          <span className="block text-xs text-zinc-600">
                            {e.notes}
                          </span>
                        ) : null}
                      </td>
                      <td className="p-2 tabular-nums">{e.male}</td>
                      <td className="p-2 tabular-nums">{e.female}</td>
                      <td className="p-2 tabular-nums font-medium">
                        {e.male + e.female}
                      </td>
                      <td className="p-2 text-zinc-800">{e.by ?? "—"}</td>
                      {!readOnly && (
                        <td className="p-2">
                          <button
                            type="button"
                            className="text-xs font-semibold text-red-700 hover:underline"
                            onClick={() => removeEntry(e.id, e.kind)}
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
        </div>

        <div className={activeTab !== "totals" ? "hidden" : undefined}>
          <TabPanel className="border-0 bg-transparent p-0 shadow-none">
            {data?.summary ? (
              <DailySummaryTable
                stationName={data.station?.name ?? "Station"}
                reportDate={reportDate}
                arrivals={data.summary.arrivals}
                departures={data.summary.departures}
                specialCategories={data.summary.specialCategories}
              />
            ) : (
              <p className="rounded-lg border border-zinc-300 bg-white p-6 text-center text-sm font-medium text-zinc-700">
                No data for this date yet.
              </p>
            )}
          </TabPanel>
        </div>

        <div className={activeTab !== "submit" ? "hidden" : undefined}>
          <TabPanel>
            <div className="space-y-4">
              <p className="text-sm text-zinc-700">
                Complete remarks, then submit the full day to HQ. Totals are on
                the Day totals tab ({entryCount} entries logged).
              </p>
              <label className="block text-sm">
                <span className="font-semibold text-zinc-900">
                  Staff on duty
                </span>
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
              <label className="block text-sm">
                <span className="font-semibold text-zinc-900">
                  Urgent matters
                </span>
                <textarea
                  readOnly={readOnly}
                  className="mt-1 w-full rounded border border-zinc-400 px-3 py-2 text-zinc-900"
                  rows={2}
                  value={urgentMatters}
                  onChange={(e) => setUrgentMatters(e.target.value)}
                />
              </label>
              {!readOnly && (
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button type="button" variant="secondary" onClick={saveRemarks}>
                    Save remarks
                  </Button>
                  <Button type="button" onClick={submitReport}>
                    Submit day report to HQ
                  </Button>
                </div>
              )}
              {readOnly && (
                <p className="text-sm font-semibold text-emerald-800">
                  Report status: {data?.status}
                </p>
              )}
            </div>
          </TabPanel>
        </div>
      </div>
    </div>
  );
}
