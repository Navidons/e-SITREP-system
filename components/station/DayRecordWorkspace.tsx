"use client";

import { useCallback, useEffect, useState } from "react";
import { NationalitySelect } from "@/components/forms/NationalitySelect";
import { useAppPreferences } from "@/components/providers/AppPreferencesProvider";
import { Button } from "@/components/ui/button";
import { Tabs, TabPanel } from "@/components/ui/tabs";
import { DailySummaryTable } from "@/components/forms/DailySummaryTable";
import { RejectionBanner } from "@/components/station/RejectionBanner";
import { formatDateInput, cn } from "@/lib/utils";
import { CheckCircle, AlertCircle, Sparkles, Clock, ListFilter, BarChart3, Send } from "lucide-react";
import { ENTRY_LABELS, entryTypesForProfile, ReportingProfile } from "@/lib/station/entry-config";
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
  const [loading, setLoading] = useState(false);
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
    setMessage(`${ENTRY_LABELS[entryType]} saved successfully.`);
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
          ? "Update submitted to HQ verifiers."
          : "Entry successfully updated and totals reconciled."),
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
        (isSubmitted && !isAdmin ? "Removal request successfully submitted to HQ." : "Entry successfully removed."),
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
    setMessage("Remarks and metadata successfully saved.");
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
    setMessage(`Day report for ${reportDate} successfully submitted to HQ.`);
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
            className={cn(
              "rounded-lg border px-3 py-2.5 text-sm font-bold transition-all active:scale-[0.98] cursor-pointer",
              entryType === t
                ? "border-emerald-800 bg-emerald-800 text-white shadow-md shadow-emerald-800/10"
                : "border-zinc-300 bg-zinc-50 text-zinc-900 hover:bg-zinc-100"
            )}
          >
            {ENTRY_LABELS[t]}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-600">
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
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-600">
            Male
          </label>
          <input
            type="number"
            min={0}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm text-zinc-950 shadow-sm transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none"
            value={male}
            onChange={(e) => setMale(Number(e.target.value) || 0)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-600">
            Female
          </label>
          <input
            type="number"
            min={0}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm text-zinc-950 shadow-sm transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none"
            value={female}
            onChange={(e) => setFemale(Number(e.target.value) || 0)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-zinc-600">
            Time
          </label>
          <input
            type="datetime-local"
            className="w-full max-w-xs rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm text-zinc-955 shadow-sm transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none"
            value={recordedAt}
            onChange={(e) => setRecordedAt(e.target.value)}
          />
        </div>
      </div>
      <input
        className="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-955 shadow-sm transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none"
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
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-250 bg-white px-5 py-4 shadow-sm">
        <div>
          <p className="text-xxs font-extrabold uppercase tracking-widest text-zinc-500">
            {isToday ? "Today’s record" : "Past day record"}
          </p>
          <p className="text-xl font-black text-zinc-900 tracking-tight mt-0.5">{reportDate}</p>
          <p className="text-xs font-semibold text-zinc-650 mt-1 flex items-center gap-2">
            <span>{data?.station?.name ?? "Station"}</span>
            <span className="h-3 w-px bg-zinc-300" />
            <span className={cn(
              "uppercase font-extrabold tracking-wider",
              data?.status === "approved" ? "text-emerald-800" : "text-amber-800"
            )}>
              {data?.status ?? "draft"}
            </span>
          </p>
        </div>
        {loading && (
          <span className="text-xs font-bold text-zinc-500 animate-pulse bg-zinc-100 border px-2.5 py-1 rounded-lg">Loading…</span>
        )}
      </div>

      {data?.status === "rejected" && data.rejectionReason && (
        <RejectionBanner
          reason={data.rejectionReason}
          rejectedBy={data.rejectedBy}
        />
      )}

      {message && (
        <div className="flex gap-2.5 rounded-xl border border-emerald-250 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-950 shadow-sm">
          <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-md">
        <Tabs tabs={workTabs} active={workTab} onChange={(id) => setWorkTab(id as WorkTabId)} />

        {/* Persistent tab wrappers to stabilize DOM and scroll positions */}
        
        {/* Entry / Form Tab */}
        <div className={cn(workTab !== "entry" && "hidden")}>
          <TabPanel className="overflow-visible space-y-4">
            {isSubmitted && (
              <div className="rounded-lg border border-amber-250 bg-amber-50/70 px-4 py-3 text-sm text-amber-950 flex gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-bold">
                    Day report already submitted to HQ
                  </p>
                  <p className="mt-1 text-xs text-amber-900 leading-relaxed">
                    {isAdmin
                      ? "You may add new entries directly as an admin. Others must request corrections (HQ review approved)."
                      : "Adding new entries is restricted. To edit/remove, click 'Edit' or 'Request remove' on rows in the Entry log. HQ reviews corrections."}
                  </p>
                  {pendingCount > 0 && (
                    <p className="mt-2 font-semibold text-xs flex items-center gap-1.5 text-amber-950">
                      <span className="inline-block h-2 w-2 rounded-full bg-amber-600 animate-ping" />
                      {pendingCount} pending change(s) currently awaiting HQ approval.
                    </p>
                  )}
                </div>
              </div>
            )}

            {editingEntryId ? (
              <form onSubmit={saveEdit} className="space-y-4">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-700 bg-zinc-50 border p-2.5 rounded-lg">
                  <Clock className="h-4 w-4 text-zinc-500" />
                  <span>
                    Editing entry #{editingEntryId} {isSubmitted && !isAdmin && "(Requires HQ approval)"}
                  </span>
                </div>
                {entryFields}
                {isSubmitted && !isAdmin && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600">
                      Reason for correction
                    </label>
                    <textarea
                      required
                      rows={2}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-955 shadow-sm focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none"
                      placeholder="Specify why this entry is being updated…"
                      value={correctionReason}
                      onChange={(e) => setCorrectionReason(e.target.value)}
                    />
                  </div>
                )}
                <div className="flex gap-2.5 pt-2 border-t border-zinc-200">
                  <Button 
                    type="submit"
                    className="rounded-lg font-bold py-2.5 px-6 shadow-sm active:scale-[0.98] transition-all bg-emerald-800 text-white hover:bg-emerald-900 cursor-pointer"
                  >
                    {isSubmitted && !isAdmin
                      ? "Submit correction to HQ"
                      : "Save changes"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="secondary" 
                    className="rounded-lg shadow-sm font-bold cursor-pointer hover:bg-zinc-100"
                    onClick={cancelEdit}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : canAddNew ? (
              <form onSubmit={addEntry} className="space-y-4">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  {isSubmitted && isAdmin
                    ? `Add new batch directly to submitted report (admin override)`
                    : `Insert movement batch details`}
                </p>
                {entryFields}
                <Button 
                  type="submit"
                  className="rounded-lg font-bold py-2.5 px-6 shadow-sm active:scale-[0.98] transition-all bg-emerald-800 text-white hover:bg-emerald-900 cursor-pointer"
                >
                  {isSubmitted ? "Add direct entry" : `Save to ${reportDate}`}
                </Button>
              </form>
            ) : (
              <div className="py-6 text-center space-y-2">
                <ListFilter className="h-8 w-8 mx-auto text-zinc-400" />
                <p className="text-sm font-medium text-zinc-600">
                  Adding new records is disabled. Use the <strong className="text-emerald-900">Entry log</strong> tab to submit correction requests.
                </p>
              </div>
            )}
          </TabPanel>
        </div>

        {/* Entry Log Tab */}
        <div className={cn(workTab !== "log" && "hidden")}>
          <TabPanel className="p-0">
            <div className="overflow-x-auto p-4">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b bg-zinc-50 text-left border-zinc-200">
                    <th className="p-3 text-xs font-bold uppercase tracking-wider text-zinc-550">Time</th>
                    <th className="p-3 text-xs font-bold uppercase tracking-wider text-zinc-550">Entry details</th>
                    <th className="p-3 text-xs font-bold uppercase tracking-wider text-zinc-550 w-16">Male</th>
                    <th className="p-3 text-xs font-bold uppercase tracking-wider text-zinc-550 w-16">Female</th>
                    <th className="p-3 text-xs font-bold uppercase tracking-wider text-zinc-550 w-16">Total</th>
                    <th className="p-3 text-xs font-bold uppercase tracking-wider text-zinc-550">Officer</th>
                    <th className="p-3 w-32" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {sortedEntries.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="p-8 text-center text-sm font-semibold text-zinc-500"
                      >
                        No entries recorded for {reportDate}.
                      </td>
                    </tr>
                  )}
                  {sortedEntries.map((e) => (
                    <tr key={e.id} className="hover:bg-zinc-50/40 transition">
                      <td className="p-3 tabular-nums font-medium text-zinc-600">{formatTime(e.recordedAt)}</td>
                      <td className="p-3 font-semibold text-zinc-900">
                        {entryLabel(e)}
                        {e.notes && (
                          <span className="block text-xxs font-medium text-zinc-500 mt-1 italic">
                            Note: {e.notes}
                          </span>
                        )}
                      </td>
                      <td className="p-3 tabular-nums text-zinc-800 font-medium">{e.male}</td>
                      <td className="p-3 tabular-nums text-zinc-800 font-medium">{e.female}</td>
                      <td className="p-3 tabular-nums font-bold text-emerald-950">
                        {e.male + e.female}
                      </td>
                      <td className="p-3 text-xs text-zinc-600 font-medium">
                        {e.enteredBy?.fullName ?? "—"}
                      </td>
                      <td className="p-3 text-right">
                        <div className="inline-flex gap-2.5">
                          <button
                            type="button"
                            className="text-xs font-extrabold uppercase tracking-wider text-emerald-800 hover:text-emerald-950 hover:underline cursor-pointer"
                            onClick={() => startEditEntry(e)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="text-xs font-extrabold uppercase tracking-wider text-red-700 hover:text-red-950 hover:underline cursor-pointer"
                            onClick={() => removeEntry(e.id)}
                          >
                            {isSubmitted && !isAdmin
                              ? "Req remove"
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
              <div className="border-t border-zinc-200 p-5 bg-zinc-50/50">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600 mb-3">
                  Correction history & audit log
                </h3>
                <ul className="space-y-2">
                  {(data?.amendments ?? []).map((a) => (
                    <li
                      key={a.id}
                      className="rounded-lg border border-zinc-200 bg-white p-3.5 text-xs shadow-sm flex items-start justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <span className="font-semibold text-zinc-900">
                          {a.summary}
                        </span>
                        {a.reason && (
                          <span className="block text-zinc-500 font-medium mt-0.5">
                            Reason: {a.reason}
                          </span>
                        )}
                        {a.reviewComment && (
                          <span className="block text-emerald-900 font-bold mt-1">
                            HQ Comment: {a.reviewComment}
                          </span>
                        )}
                      </div>
                      <span className={cn(
                        "rounded px-2 py-0.5 text-xxs font-extrabold uppercase tracking-wider border",
                        a.status === "approved"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : a.status === "rejected"
                            ? "bg-red-50 text-red-800 border-red-200"
                            : "bg-amber-50 text-amber-800 border-amber-250"
                      )}>
                        {a.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </TabPanel>
        </div>

        {/* Day Totals Tab */}
        {data?.summary && (
          <div className={cn(workTab !== "totals" && "hidden")}>
            <TabPanel className="border-0 bg-transparent p-0 shadow-none">
              <DailySummaryTable
                stationName={data.station?.name ?? "Station"}
                reportDate={reportDate}
                arrivals={data.summary.arrivals}
                departures={data.summary.departures}
                specialCategories={data.summary.specialCategories}
              />
            </TabPanel>
          </div>
        )}

        {/* Submit Day Tab */}
        <div className={cn(workTab !== "day" && "hidden")}>
          <TabPanel className="space-y-5">
            <div>
              {isSubmitted ? (
                <div className="flex gap-2 rounded-lg bg-emerald-50 border border-emerald-250 px-3.5 py-3 text-xs text-emerald-950">
                  <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                  <span className="font-bold">
                    This day report was already submitted to HQ. You can save remarks or metadata edits below, but cannot submit again.
                  </span>
                </div>
              ) : (
                <p className="text-sm text-zinc-600 leading-relaxed font-semibold">
                  Complete day metadata and staff records for {reportDate} below. Verify calculations on the Day totals tab before finalizing.
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 sm:col-span-2">
                Staff on Duty
                <input
                  type="number"
                  min={0}
                  readOnly={isSubmitted && !isAdmin}
                  className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-955 shadow-sm transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none disabled:bg-zinc-150"
                  value={staffOnDuty}
                  onChange={(e) =>
                    setStaffOnDuty(Number(e.target.value) || 0)
                  }
                />
              </label>
              
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 sm:col-span-2">
                Medical screening
                <textarea
                  readOnly={isSubmitted && !isAdmin}
                  rows={2}
                  placeholder="Record screen result notes…"
                  className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-955 shadow-sm transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none disabled:bg-zinc-150"
                  value={medicalScreening}
                  onChange={(e) => setMedicalScreening(e.target.value)}
                />
              </label>

              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 sm:col-span-2">
                General remarks
                <textarea
                  readOnly={isSubmitted && !isAdmin}
                  rows={2}
                  placeholder="Record general duty notes…"
                  className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-955 shadow-sm transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none disabled:bg-zinc-150"
                  value={generalRemarks}
                  onChange={(e) => setGeneralRemarks(e.target.value)}
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2.5 pt-3 border-t border-zinc-200">
              <Button 
                type="button" 
                variant="secondary" 
                className="rounded-lg shadow-sm font-bold cursor-pointer hover:bg-zinc-100"
                onClick={saveRemarks}
              >
                {isSubmitted ? "Save day metadata (admin)" : "Save remarks"}
              </Button>
              {isDraft && (
                <Button 
                  type="button" 
                  className="rounded-lg font-bold py-2.5 px-6 shadow-md active:scale-[0.98] transition-all bg-emerald-800 text-white hover:bg-emerald-900 cursor-pointer"
                  onClick={submitDay}
                >
                  Submit Day report to HQ
                </Button>
              )}
            </div>
          </TabPanel>
        </div>
      </div>
    </div>
  );
}
