"use client";

import { useCallback, useEffect, useState } from "react";
import { NationalitySelect } from "@/components/forms/NationalitySelect";
import { useAppPreferences } from "@/components/providers/AppPreferencesProvider";
import { Button } from "@/components/ui/button";
import { TabGroup } from "@/components/ui/tabs";
import { Alert } from "@/components/ui/alert";
import { LoadingOverlay } from "@/components/ui/loading";
import { Spinner } from "@/components/ui/spinner";
import { DailySummaryTable } from "@/components/forms/DailySummaryTable";
import { RejectionBanner } from "@/components/station/RejectionBanner";
import { formatDateInput } from "@/lib/utils";
import {
  ENTRY_LABELS,
  entryTypesForProfile,
  ReportingProfile,
} from "@/lib/station/entry-config";
import type { DayEntryPayload, DayEntryUpdatePayload, DayEntryTypeId } from "@/types/reports";

type EntryType = Extract<
  DayEntryTypeId,
  "arrival" | "departure" | "asylum_seeker" | "refugee"
>;

const LAND_ENTRY_TYPES = entryTypesForProfile(ReportingProfile.land) as EntryType[];
type WorkTabId = "entry" | "log" | "totals" | "day";

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
  rejectionReason?: string | null;
  rejectedBy?: { fullName: string } | null;
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
  amendments?: Array<{
    id: number;
    status: string;
    action: string;
    summary: string;
    reason: string | null;
    reviewComment: string | null;
    targetEntryId: number | null;
    createdAt: string;
    requestedBy?: { fullName: string };
  }>;
  pendingAmendmentCount?: number;
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
  isAdmin = false,
}: {
  reportDate: string;
  isToday: boolean;
  isAdmin?: boolean;
}) {
  const { countryLabel } = useAppPreferences();
  const [workTab, setWorkTab] = useState<WorkTabId>("entry");
  const [data, setData] = useState<DayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const [entryType, setEntryType] = useState<EntryType>("arrival");
  const [nationalityCode, setNationalityCode] = useState("");
  const [male, setMale] = useState(0);
  const [female, setFemale] = useState(0);
  const [recordedAt, setRecordedAt] = useState(nowLocalDatetime);
  const [notes, setNotes] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);

  const [staffOnDuty, setStaffOnDuty] = useState(0);
  const [medicalScreening, setMedicalScreening] = useState("");
  const [generalRemarks, setGeneralRemarks] = useState("");
  const [urgentMatters, setUrgentMatters] = useState("");

  const isDraft =
    data?.status === "draft" || data?.status === "rejected" || !data?.status;
  const isSubmitted =
    data?.status !== undefined &&
    data.status !== "draft" &&
    data.status !== "rejected";
  const canAddNew = isDraft || isAdmin;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/daily?date=${reportDate}`);
      const json = await res.json();
      setData(json);
      setStaffOnDuty(json.staffOnDuty ?? 0);
      setMedicalScreening(json.medicalScreening ?? "");
      setGeneralRemarks(json.generalRemarks ?? "");
      setUrgentMatters(json.urgentMatters ?? "");
    } finally {
      setLoading(false);
    }
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
      setMessage(json.error ?? json.error ?? "Could not save entry");
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

  function startEditEntry(e: DailyEntryRow) {
    setEditingEntryId(e.id);
    setEntryType(e.entryType);
    setNationalityCode(e.nationalityCode ?? "");
    setMale(e.male);
    setFemale(e.female);
    setRecordedAt(e.recordedAt.slice(0, 16));
    setNotes(e.notes ?? "");
    setCorrectionReason("");
    setWorkTab("entry");
  }

  function cancelEdit() {
    setEditingEntryId(null);
    setCorrectionReason("");
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingEntryId) return;
    setMessage(null);
    if (
      (entryType === "arrival" || entryType === "departure") &&
      !nationalityCode?.trim()
    ) {
      setMessage("Select a nationality from the list.");
      return;
    }
    if (isSubmitted && !isAdmin && !correctionReason.trim()) {
      setMessage("Reason required for edits on a submitted day.");
      return;
    }
    const res = await fetch(`/api/reports/daily/entries/${editingEntryId}`, {
      method: "PATCH",
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
        correctionReason: isSubmitted && !isAdmin ? correctionReason.trim() : undefined,
      } satisfies DayEntryUpdatePayload),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error ?? "Update failed");
      return;
    }
    setData(json);
    cancelEdit();
    setMessage(
      json.message ??
        (isSubmitted && !isAdmin
          ? "Update sent for HQ approval."
          : "Entry updated. Totals reconciled."),
    );
    setWorkTab("log");
  }

  async function removeEntry(entryId: number) {
    const reason = isSubmitted && !isAdmin
      ? prompt("Reason for removal (required for HQ approval):")
      : null;
    if (isSubmitted && !isAdmin && !reason?.trim()) return;
    if (isDraft && !confirm("Remove this entry?")) return;
    if (isSubmitted && isAdmin && !confirm("Remove this entry?")) return;

    const qs = new URLSearchParams({ date: reportDate });
    if (reason?.trim()) qs.set("correctionReason", reason.trim());

    const res = await fetch(
      `/api/reports/daily/entries/${entryId}?${qs.toString()}`,
      { method: "DELETE" },
    );
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error ?? "Delete failed");
      return;
    }
    setData(json);
    setMessage(
      json.message ??
        (isSubmitted && !isAdmin ? "Removal request sent." : "Entry removed."),
    );
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
  const pendingCount = data?.pendingAmendmentCount ?? 0;

  const entryFields = (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {LAND_ENTRY_TYPES.map((t) => (
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
            required={entryType === "arrival" || entryType === "departure"}
            optional={entryType !== "arrival" && entryType !== "departure"}
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
            onChange={(e) => setFemale(Number(e.target.value) || 0)}
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
    </>
  );

  const entryTabLabel = editingEntryId
    ? "Edit entry"
    : isSubmitted
      ? isAdmin
        ? "Add entry"
        : "Modify entries"
      : "New entry";

  const workTabs = [
    { id: "entry" as const, label: entryTabLabel },
    {
      id: "log" as const,
      label: "Entry log",
      badge: entryCount + pendingCount,
    },
    { id: "totals" as const, label: "Day totals" },
    {
      id: "day" as const,
      label: isSubmitted ? "Modify day" : "Submit day",
    },
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
          <span className="flex items-center gap-2 text-sm font-medium text-zinc-600">
            <Spinner size="sm" />
            Loading day…
          </span>
        )}
      </div>

      {data?.status === "rejected" && data.rejectionReason && (
        <RejectionBanner
          reason={data.rejectionReason}
          rejectedBy={data.rejectedBy}
        />
      )}

      {message && (
        <Alert variant={message.toLowerCase().includes("fail") || message.toLowerCase().includes("error") ? "error" : "success"} onDismiss={() => setMessage(null)}>
          {message}
        </Alert>
      )}

      <div className="relative">
        {loading && <LoadingOverlay message="Loading day record…" />}
        <TabGroup
          tabs={workTabs}
          active={workTab}
          onChange={(id) => setWorkTab(id as WorkTabId)}
          minHeight="min-h-[22rem]"
        >
        <TabGroup.Panel id="entry" className="overflow-visible">
            {isSubmitted && (
              <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                <p className="font-semibold">
                  Day submitted — cannot submit again
                </p>
                <p className="mt-1">
                  {isAdmin
                    ? "You may add new entries directly. Others must edit existing lines (HQ approves their changes)."
                    : "Add new entries is disabled. Edit existing entries from the log; HQ approves before totals update."}
                </p>
                {pendingCount > 0 && (
                  <p className="mt-1 font-medium">
                    {pendingCount} pending change(s) awaiting HQ.
                  </p>
                )}
              </div>
            )}

            {editingEntryId ? (
              <form onSubmit={saveEdit} className="space-y-4">
                <p className="text-sm font-semibold text-zinc-900">
                  Editing entry #{editingEntryId}
                  {isSubmitted && !isAdmin && " (HQ must approve)"}
                </p>
                {entryFields}
                {isSubmitted && !isAdmin && (
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-zinc-900">
                      Reason for change
                    </label>
                    <textarea
                      required
                      rows={2}
                      className="w-full rounded border border-zinc-400 px-3 py-2 text-zinc-900"
                      value={correctionReason}
                      onChange={(e) => setCorrectionReason(e.target.value)}
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <Button type="submit">
                    {isSubmitted && !isAdmin
                      ? "Submit update for approval"
                      : "Save changes"}
                  </Button>
                  <Button type="button" variant="secondary" onClick={cancelEdit}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : canAddNew ? (
              <form onSubmit={addEntry} className="space-y-4">
                <p className="text-sm text-zinc-700">
                  {isSubmitted && isAdmin
                    ? `Add a new batch to submitted day ${reportDate} (admin).`
                    : `Each save adds a new batch to ${reportDate}.`}
                </p>
                {entryFields}
                <Button type="submit">
                  {isSubmitted ? "Add entry (admin)" : `Save to ${reportDate}`}
                </Button>
              </form>
            ) : (
              <p className="text-sm text-zinc-700">
                Open <strong>Entry log</strong> and choose <strong>Edit</strong> on
                a row to modify it.
              </p>
            )}
        </TabGroup.Panel>

        <TabGroup.Panel id="log" className="p-0">
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
                    <th className="p-2" />
                  </tr>
                </thead>
                <tbody>
                  {sortedEntries.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
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
                      <td className="p-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="text-xs font-semibold text-emerald-800"
                            onClick={() => startEditEntry(e)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="text-xs font-semibold text-red-700"
                            onClick={() => removeEntry(e.id)}
                          >
                            {isSubmitted && !isAdmin
                              ? "Request remove"
                              : "Remove"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(data?.amendments?.length ?? 0) > 0 && (
              <div className="border-t border-zinc-200 p-4">
                <h3 className="mb-2 text-sm font-semibold text-zinc-900">
                  Correction history
                </h3>
                <ul className="space-y-2 text-sm">
                  {(data?.amendments ?? []).map((a) => (
                    <li
                      key={a.id}
                      className="rounded border border-zinc-200 px-3 py-2"
                    >
                      <span className="font-medium uppercase text-zinc-700">
                        {a.status}
                      </span>
                      {" — "}
                      {a.summary}
                      {a.reason && (
                        <span className="block text-xs text-zinc-600">
                          Reason: {a.reason}
                        </span>
                      )}
                      {a.reviewComment && (
                        <span className="block text-xs text-zinc-600">
                          HQ: {a.reviewComment}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </TabGroup.Panel>

        <TabGroup.Panel id="totals" className="border-0 bg-transparent p-0 shadow-none">
          {data?.summary ? (
            <DailySummaryTable
              stationName={data.station?.name ?? "Station"}
              reportDate={reportDate}
              arrivals={data.summary.arrivals}
              departures={data.summary.departures}
              specialCategories={data.summary.specialCategories}
            />
          ) : (
            <p className="text-sm text-zinc-600">Load day data to see totals.</p>
          )}
        </TabGroup.Panel>

        <TabGroup.Panel id="day">
            <div className="space-y-4">
              {isSubmitted ? (
                <p className="text-sm text-zinc-700">
                  This day was already submitted to HQ. Update remarks or metadata
                  below — you cannot submit again.
                </p>
              ) : (
                <p className="text-sm text-zinc-700">
                  Close <strong>{reportDate}</strong> when all batches are logged (
                  {entryCount} entries), then submit once to HQ.
                </p>
              )}
              <label className="block text-sm">
                <span className="font-semibold text-zinc-900">Staff on duty</span>
                <input
                  type="number"
                  min={0}
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
                  className="mt-1 w-full rounded border border-zinc-400 px-3 py-2 text-zinc-900"
                  rows={2}
                  value={generalRemarks}
                  onChange={(e) => setGeneralRemarks(e.target.value)}
                />
              </label>
              <div className="flex flex-wrap gap-3">
                <Button type="button" variant="secondary" onClick={saveRemarks}>
                  {isSubmitted ? "Save day modifications" : "Save remarks"}
                </Button>
                {isDraft && (
                  <Button type="button" onClick={submitDay}>
                    Submit {reportDate} to HQ
                  </Button>
                )}
              </div>
            </div>
        </TabGroup.Panel>
        </TabGroup>
      </div>
    </div>
  );
}
