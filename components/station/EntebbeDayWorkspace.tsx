"use client";

import { useCallback, useEffect, useState } from "react";
import { NationalitySelect } from "@/components/forms/NationalitySelect";
import { useAppPreferences } from "@/components/providers/AppPreferencesProvider";
import { EntebbeSummaryTable } from "@/components/station/EntebbeSummaryTable";
import { RejectionBanner } from "@/components/station/RejectionBanner";
import type { DayData, DailyEntryRow } from "@/components/station/shared-day-types";
import { Button } from "@/components/ui/button";
import { Tabs, TabPanel } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { CheckCircle, AlertCircle, Clock, ListFilter, Calendar, Send } from "lucide-react";
import {
  AIR_MODULE_GROUPS,
  ENTRY_LABELS,
  isFlightEntryType,
  isPersonCaseEntryType,
} from "@/lib/station/entry-config";
import type { DayEntryPayload, DayEntryTypeId } from "@/types/reports";

type WorkTabId = "entry" | "log" | "occurrences" | "totals" | "day";
type AirModuleId = (typeof AIR_MODULE_GROUPS)[number]["id"];

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

function defaultTypeForModule(module: AirModuleId): DayEntryTypeId {
  if (module === "flights") return "flight_arrival";
  if (module === "deportees") return "deportee";
  return "offloaded";
}

export function EntebbeDayWorkspace({
  reportDate,
  isAdmin = false,
}: {
  reportDate: string;
  isToday?: boolean;
  isAdmin?: boolean;
}) {
  const { countryLabel } = useAppPreferences();
  const [workTab, setWorkTab] = useState<WorkTabId>("entry");
  const [airModule, setAirModule] = useState<AirModuleId>("flights");
  const [data, setData] = useState<DayData | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [entryType, setEntryType] = useState<DayEntryTypeId>("flight_arrival");
  const [nationalityCode, setNationalityCode] = useState("");
  const [male, setMale] = useState(0);
  const [female, setFemale] = useState(0);
  const [flightNumber, setFlightNumber] = useState("");
  const [route, setRoute] = useState("");
  const [shift, setShift] = useState<"B" | "D">("D");
  const [passportNo, setPassportNo] = useState("");
  const [personName, setPersonName] = useState("");
  const [recordedAt, setRecordedAt] = useState(nowLocalDatetime);
  const [notes, setNotes] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);

  const [staffOnDuty, setStaffOnDuty] = useState(0);
  const [staffLeaveNotes, setStaffLeaveNotes] = useState("");
  const [inadmissibleCount, setInadmissibleCount] = useState(0);
  const [generalRemarks, setGeneralRemarks] = useState("");
  const [urgentMatters, setUrgentMatters] = useState("");

  const [occShift, setOccShift] = useState<"night" | "day">("day");
  const [occDescription, setOccDescription] = useState("");
  const [occPassport, setOccPassport] = useState("");
  const [occName, setOccName] = useState("");

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
    setStaffLeaveNotes(json.staffLeaveNotes ?? "");
    setInadmissibleCount(json.inadmissibleCount ?? 0);
    setGeneralRemarks(json.generalRemarks ?? "");
    setUrgentMatters(json.urgentMatters ?? "");
  }, [reportDate]);

  useEffect(() => {
    load();
    setWorkTab("entry");
  }, [load]);

  function entryLabel(e: DailyEntryRow): string {
    if (isFlightEntryType(e.entryType)) {
      const dir = e.entryType === "flight_arrival" ? "Arr" : "Dep";
      const prep = e.entryType === "flight_arrival" ? "from" : "to";
      return `${dir} ${e.flightNumber} ${prep} ${e.route} — ${e.male} pax (shift ${e.shift})`;
    }
    const type = ENTRY_LABELS[e.entryType];
    const who = e.personName ?? e.passportNo ?? countryLabel(e.nationalityCode ?? "");
    return who ? `${type} — ${who}` : type;
  }

  function selectModule(id: AirModuleId) {
    setAirModule(id);
    setEntryType(defaultTypeForModule(id));
    setEditingEntryId(null);
  }

  function buildPayload(): DayEntryPayload {
    return {
      reportDate,
      entryType,
      nationalityCode: nationalityCode || undefined,
      male: isFlightEntryType(entryType) ? male : Math.max(1, male + female),
      female: isFlightEntryType(entryType) ? 0 : female,
      flightNumber: flightNumber || undefined,
      route: route || undefined,
      shift: shift || undefined,
      passportNo: passportNo || undefined,
      personName: personName || undefined,
      recordedAt: new Date(recordedAt).toISOString(),
      notes: notes || undefined,
      correctionReason:
        isSubmitted && !isAdmin ? correctionReason.trim() : undefined,
    };
  }

  async function saveEntry(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (editingEntryId) {
      await saveEdit(e);
      return;
    }
    const res = await fetch("/api/reports/daily/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload()),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error ?? "Could not save");
      return;
    }
    setData(json);
    resetEntryForm();
    setMessage(`${ENTRY_LABELS[entryType]} saved.`);
    setWorkTab("log");
  }

  function resetEntryForm() {
    setMale(0);
    setFemale(0);
    setNationalityCode("");
    setFlightNumber("");
    setRoute("");
    setNotes("");
    setPassportNo("");
    setPersonName("");
    setRecordedAt(nowLocalDatetime());
    setEntryType(defaultTypeForModule(airModule));
  }

  function startEditEntry(row: DailyEntryRow) {
    setEditingEntryId(row.id);
    setEntryType(row.entryType);
    setNationalityCode(row.nationalityCode ?? "");
    setMale(row.male);
    setFemale(row.female);
    setFlightNumber(row.flightNumber ?? "");
    setRoute(row.route ?? "");
    setShift((row.shift as "B" | "D") ?? "D");
    setPassportNo(row.passportNo ?? "");
    setPersonName(row.personName ?? "");
    setRecordedAt(row.recordedAt.slice(0, 16));
    setNotes(row.notes ?? "");
    if (isFlightEntryType(row.entryType)) setAirModule("flights");
    else if (
      row.entryType === "deportee" ||
      row.entryType === "returned_person"
    ) {
      setAirModule("deportees");
    } else setAirModule("denied");
    setWorkTab("entry");
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingEntryId) return;
    if (isSubmitted && !isAdmin && !correctionReason.trim()) {
      setMessage("Reason required for edits on a submitted day.");
      return;
    }
    const res = await fetch(`/api/reports/daily/entries/${editingEntryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload()),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error ?? "Update failed");
      return;
    }
    setData(json);
    setEditingEntryId(null);
    setCorrectionReason("");
    setMessage(json.message ?? "Updated.");
    setWorkTab("log");
  }

  async function removeEntry(entryId: number) {
    const reason =
      isSubmitted && !isAdmin
        ? prompt("Reason for removal (required for HQ approval):")
        : null;
    if (isSubmitted && !isAdmin && !reason?.trim()) return;
    if (isDraft && !confirm("Remove this record?")) return;

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
    setMessage("Record removed.");
  }

  async function saveDayFields() {
    const res = await fetch("/api/reports/daily", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportDate,
        staffOnDuty,
        staffLeaveNotes,
        inadmissibleCount,
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
    setMessage("Day details saved.");
  }

  async function submitDay() {
    if (!data?.id) {
      setMessage("Add flight or case records before submitting.");
      return;
    }
    const res = await fetch(`/api/reports/${data.id}/submit`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error ?? "Submit failed");
      return;
    }
    await load();
    setMessage(`Entebbe report for ${reportDate} submitted to HQ.`);
  }

  async function addOccurrence(e: React.FormEvent) {
    e.preventDefault();
    if (!occDescription.trim()) {
      setMessage("Describe the occurrence.");
      return;
    }
    const res = await fetch("/api/reports/daily/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportDate,
        incidentType: `occurrence_${occShift}`,
        description: occDescription.trim(),
        passportNo: occPassport || undefined,
        personName: occName || undefined,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error ?? "Could not save occurrence");
      return;
    }
    setData(json);
    setOccDescription("");
    setOccPassport("");
    setOccName("");
    setMessage("Occurrence logged.");
    setWorkTab("log");
  }

  async function removeIncident(id: number) {
    if (!confirm("Remove this occurrence?")) return;
    const res = await fetch(
      `/api/reports/daily/incidents/${id}?date=${reportDate}`,
      { method: "DELETE" },
    );
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error ?? "Could not remove");
      return;
    }
    setData(json);
  }

  const air = data?.summary?.air ?? {
    flightArrivals: { flights: 0, passengers: 0 },
    flightDepartures: { flights: 0, passengers: 0 },
    deportees: 0,
    returned: 0,
    offloaded: 0,
    denied: 0,
  };

  const workTabs = [
    { id: "entry" as const, label: editingEntryId ? "Edit record" : "New record" },
    {
      id: "log" as const,
      label: "Activity log",
      badge: (data?.entries?.length ?? 0) + (data?.incidents?.length ?? 0),
    },
    { id: "occurrences" as const, label: "Occurrences" },
    { id: "totals" as const, label: "Day totals" },
    { id: "day" as const, label: isSubmitted ? "Modify day" : "Submit day" },
  ];

  const sortedEntries = [...(data?.entries ?? [])].sort(
    (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
  );

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
        <strong>Entebbe International Airport</strong> — report period 2:00 PM to
        2:00 PM. Log flights (passenger counts), deportees, returned persons,
        offloaded and denied passengers, plus shift occurrences.
      </div>

      {data?.status === "rejected" && data.rejectionReason && (
        <RejectionBanner
          reason={data.rejectionReason}
          rejectedBy={data.rejectedBy}
        />
      )}

      {message && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-950">
          {message}
        </p>
      )}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-md">
        <Tabs
          tabs={workTabs}
          active={workTab}
          onChange={(id) => setWorkTab(id as WorkTabId)}
        />

        {/* Persistent Tab Panels */}

        {/* Entry Form Panel */}
        <div className={cn(workTab !== "entry" && "hidden")}>
          <TabPanel className="space-y-4">
            {isSubmitted && (
              <div className="rounded-lg border border-amber-250 bg-amber-50/70 px-4 py-3 text-sm text-amber-955 flex gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-bold">Day report already submitted to HQ</p>
                  <p className="mt-1 text-xs text-amber-900 leading-relaxed">
                    New records require HQ correction approval unless you are an admin.
                  </p>
                </div>
              </div>
            )}
            {!canAddNew && isSubmitted && (
              <div className="py-6 text-center space-y-2">
                <ListFilter className="h-8 w-8 mx-auto text-zinc-400" />
                <p className="text-sm font-medium text-zinc-650">
                  Adding new records is disabled. Use the <strong className="text-emerald-900">Activity log</strong> tab to edit or request removal.
                </p>
              </div>
            )}
            {(canAddNew || editingEntryId) && (
              <form onSubmit={saveEntry} className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  {AIR_MODULE_GROUPS.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => selectModule(g.id)}
                      className={cn(
                        "rounded-lg border px-3.5 py-2 text-xs font-bold transition-all active:scale-[0.98] cursor-pointer",
                        airModule === g.id
                          ? "border-emerald-800 bg-emerald-800 text-white shadow-md shadow-emerald-800/10"
                          : "border-zinc-300 bg-zinc-50 text-zinc-800 hover:bg-zinc-100"
                      )}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>

                {airModule === "flights" && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2.5">
                      {(["flight_arrival", "flight_departure"] as const).map(
                        (t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setEntryType(t)}
                            className={cn(
                              "rounded-lg border px-3.5 py-2 text-xs font-bold transition-all active:scale-[0.98] cursor-pointer",
                              entryType === t
                                ? "border-emerald-800 bg-emerald-800 text-white shadow-md"
                                : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                            )}
                          >
                            {ENTRY_LABELS[t]}
                          </button>
                        ),
                      )}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600">Shift</label>
                        <select
                          className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm text-zinc-950 shadow-sm focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none"
                          value={shift}
                          onChange={(e) =>
                            setShift(e.target.value as "B" | "D")
                          }
                        >
                          <option value="D">D — Day</option>
                          <option value="B">B — Night</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600">
                          Flight no.
                        </label>
                        <input
                          className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm text-zinc-950 shadow-sm focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none uppercase placeholder:text-zinc-400"
                          value={flightNumber}
                          onChange={(e) => setFlightNumber(e.target.value)}
                          placeholder="ET338"
                          required
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600">
                          {entryType === "flight_arrival"
                            ? "From (city)"
                            : "To (city)"}
                        </label>
                        <input
                          className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm text-zinc-950 shadow-sm focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none placeholder:text-zinc-400"
                          value={route}
                          onChange={(e) => setRoute(e.target.value)}
                          placeholder="Addis Ababa"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600">
                          Passengers
                        </label>
                        <input
                          type="number"
                          min={1}
                          className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm text-zinc-955 shadow-sm focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none"
                          value={male}
                          onChange={(e) => setMale(Number(e.target.value) || 0)}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600">Time</label>
                        <input
                          type="datetime-local"
                          className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm text-zinc-955 shadow-sm focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none"
                          value={recordedAt}
                          onChange={(e) => setRecordedAt(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {airModule === "deportees" && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2.5">
                      {(["deportee", "returned_person"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setEntryType(t)}
                          className={cn(
                            "rounded-lg border px-3.5 py-2 text-xs font-bold transition-all active:scale-[0.98] cursor-pointer",
                            entryType === t
                              ? "border-emerald-800 bg-emerald-800 text-white shadow-md"
                              : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                          )}
                        >
                          {ENTRY_LABELS[t]}
                        </button>
                      ))}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600">Name</label>
                        <input
                          className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm text-zinc-950 shadow-sm focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none"
                          value={personName}
                          onChange={(e) => setPersonName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600">
                          Passport no.
                        </label>
                        <input
                          className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm text-zinc-950 shadow-sm focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none"
                          value={passportNo}
                          onChange={(e) => setPassportNo(e.target.value)}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600">
                          Nationality (optional)
                        </label>
                        <NationalitySelect
                          value={nationalityCode}
                          onChange={setNationalityCode}
                          optional
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600">
                          Case details
                        </label>
                        <textarea
                          className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm text-zinc-950 shadow-sm focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none placeholder:text-zinc-400"
                          rows={3}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Reason for deportation / return…"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                {airModule === "denied" && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2.5">
                      {(["offloaded", "denied_entry"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setEntryType(t)}
                          className={cn(
                            "rounded-lg border px-3.5 py-2 text-xs font-bold transition-all active:scale-[0.98] cursor-pointer",
                            entryType === t
                              ? "border-emerald-800 bg-emerald-800 text-white shadow-md"
                              : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                          )}
                        >
                          {ENTRY_LABELS[t]}
                        </button>
                      ))}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600">Name</label>
                        <input
                          className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm text-zinc-955 shadow-sm focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none"
                          value={personName}
                          onChange={(e) => setPersonName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600">
                          Passport no.
                        </label>
                        <input
                          className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm text-zinc-955 shadow-sm focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none"
                          value={passportNo}
                          onChange={(e) => setPassportNo(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600">
                          Flight (optional)
                        </label>
                        <input
                          className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm text-zinc-955 shadow-sm focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none uppercase"
                          value={flightNumber}
                          onChange={(e) => setFlightNumber(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600">
                          Nationality (optional)
                        </label>
                        <NationalitySelect
                          value={nationalityCode}
                          onChange={setNationalityCode}
                          optional
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600">Details</label>
                        <textarea
                          className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-955 shadow-sm focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none"
                          rows={3}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                {isSubmitted && !isAdmin && editingEntryId && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600">Correction Reason (required)</label>
                    <input
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-955 shadow-sm focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none"
                      placeholder="Specify the reason for this correction request…"
                      value={correctionReason}
                      onChange={(e) => setCorrectionReason(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div className="flex flex-wrap gap-2.5 pt-2 border-t border-zinc-200">
                  <Button 
                    type="submit"
                    className="rounded-lg font-bold py-2.5 px-6 shadow-sm active:scale-[0.98] transition-all bg-emerald-800 text-white hover:bg-emerald-900 cursor-pointer"
                  >
                    {editingEntryId ? "Save changes" : "Save record"}
                  </Button>
                  {editingEntryId && (
                    <Button 
                      type="button" 
                      variant="secondary" 
                      className="rounded-lg shadow-sm font-bold cursor-pointer hover:bg-zinc-100"
                      onClick={() => {
                        setEditingEntryId(null);
                        resetEntryForm();
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            )}
          </TabPanel>
        </div>

        {/* Activity Log Panel */}
        <div className={cn(workTab !== "log" && "hidden")}>
          <TabPanel>
            {loading ? (
              <p className="text-sm font-semibold text-zinc-550">Loading Activity Log…</p>
            ) : (
              <div className="space-y-6">
                <div>
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-600">
                    Registered Entries
                  </h4>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-zinc-50 text-left border-zinc-200">
                        <th className="p-2.5 text-xs font-bold uppercase tracking-wider text-zinc-500">Time</th>
                        <th className="p-2.5 text-xs font-bold uppercase tracking-wider text-zinc-500">Record Description</th>
                        <th className="p-2.5 w-24" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {sortedEntries.length === 0 && (
                        <tr>
                          <td colSpan={3} className="p-6 text-center text-zinc-500 font-semibold">
                            No flight or passenger records logged yet.
                          </td>
                        </tr>
                      )}
                      {sortedEntries.map((e) => (
                        <tr key={e.id} className="hover:bg-zinc-50/45 transition">
                          <td className="p-2.5 tabular-nums text-zinc-600 font-medium">{formatTime(e.recordedAt)}</td>
                          <td className="p-2.5 font-semibold text-zinc-950">{entryLabel(e)}</td>
                          <td className="p-2.5 text-right">
                            <div className="inline-flex gap-2">
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
                <div>
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-650">
                    Logged Incident & Shift Occurrences
                  </h4>
                  {(data?.incidents ?? []).length === 0 ? (
                    <p className="text-sm font-semibold text-zinc-500 bg-zinc-50/50 p-4 rounded-xl border border-zinc-150 text-center">No occurrences logged yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {(data?.incidents ?? []).map((i) => (
                        <li
                          key={i.id}
                          className="rounded-xl border border-zinc-200 bg-white p-4 text-sm shadow-sm flex items-start justify-between gap-4"
                        >
                          <div>
                            <span className="font-extrabold uppercase tracking-wider text-xxs text-zinc-500 bg-zinc-100 border px-2 py-0.5 rounded">
                              {i.incidentType?.replace("occurrence_", "") ?? "Occurrence"} Shift
                            </span>
                            <p className="mt-2 text-zinc-900 font-medium">{i.description}</p>
                          </div>
                          {isDraft && (
                            <button
                              type="button"
                              className="text-xs font-extrabold uppercase tracking-wider text-red-700 hover:underline cursor-pointer shrink-0 mt-0.5"
                              onClick={() => removeIncident(i.id)}
                            >
                              Remove
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </TabPanel>
        </div>

        {/* Occurrences Tab */}
        <div className={cn(workTab !== "occurrences" && "hidden")}>
          <TabPanel className="space-y-4">
            {isSubmitted ? (
              <div className="rounded-lg border border-amber-250 bg-amber-50/70 px-4 py-3 text-sm text-amber-955">
                Add new occurrences via HQ correction workflow (not directly on submitted day). Edit general remarks on the Submit tab.
              </div>
            ) : (
              <form onSubmit={addOccurrence} className="space-y-4 max-w-xl">
                <div className="flex gap-2">
                  {(["day", "night"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setOccShift(s)}
                      className={cn(
                        "rounded-lg border px-3.5 py-2 text-xs font-bold transition-all active:scale-[0.98] cursor-pointer",
                        occShift === s
                          ? "border-emerald-800 bg-emerald-800 text-white shadow-md"
                          : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                      )}
                    >
                      {s === "day" ? "Day shift" : "Night shift"}
                    </button>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-650">Occurrence Narrative</label>
                  <textarea
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm text-zinc-955 shadow-sm focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none placeholder:text-zinc-400"
                    rows={4}
                    placeholder="Occurrence details (or NIL if none)…"
                    value={occDescription}
                    onChange={(e) => setOccDescription(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-650">Passport no. (optional)</label>
                    <input
                      className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm text-zinc-955 shadow-sm focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none"
                      value={occPassport}
                      onChange={(e) => setOccPassport(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-650">Person name (optional)</label>
                    <input
                      className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm text-zinc-955 shadow-sm focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none"
                      value={occName}
                      onChange={(e) => setOccName(e.target.value)}
                    />
                  </div>
                </div>
                <Button 
                  type="submit"
                  className="rounded-lg font-bold py-2.5 px-6 shadow-sm active:scale-[0.98] transition-all bg-emerald-800 text-white hover:bg-emerald-900 cursor-pointer"
                >
                  Log occurrence
                </Button>
              </form>
            )}
          </TabPanel>
        </div>

        {/* Day Totals Panel */}
        {data?.summary?.air && (
          <div className={cn(workTab !== "totals" && "hidden")}>
            <TabPanel className="border-0 bg-transparent p-0 shadow-none">
              <EntebbeSummaryTable
                stationName={data.station?.name ?? "ENTEBBE"}
                reportDate={reportDate}
                air={data.summary.air}
                inadmissibleCount={data.inadmissibleCount ?? 0}
                incidentCount={data.incidents?.length ?? 0}
              />
            </TabPanel>
          </div>
        )}

        {/* Submit Day Panel */}
        <div className={cn(workTab !== "day" && "hidden")}>
          <TabPanel className="space-y-5">
            <div className="space-y-4 max-w-2xl">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-655">
                Staff on duty
                <input
                  type="number"
                  min={0}
                  className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm text-zinc-955 shadow-sm focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none"
                  value={staffOnDuty}
                  onChange={(e) =>
                    setStaffOnDuty(Number(e.target.value) || 0)
                  }
                />
              </label>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-655">
                Staff on leave (by shift)
                <textarea
                  className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm text-zinc-955 shadow-sm focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none placeholder:text-zinc-400"
                  rows={3}
                  value={staffLeaveNotes}
                  onChange={(e) => setStaffLeaveNotes(e.target.value)}
                  placeholder="Shift D: … Shift B: …"
                />
              </label>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-655">
                Inadmissible count
                <input
                  type="number"
                  min={0}
                  className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm text-zinc-955 shadow-sm focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none"
                  value={inadmissibleCount}
                  onChange={(e) =>
                    setInadmissibleCount(Number(e.target.value) || 0)
                  }
                />
              </label>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-655">
                Urgent matters
                <textarea
                  className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm text-zinc-955 shadow-sm focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none"
                  rows={2}
                  value={urgentMatters}
                  onChange={(e) => setUrgentMatters(e.target.value)}
                />
              </label>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-655">
                General remarks
                <textarea
                  className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm text-zinc-955 shadow-sm focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none"
                  rows={2}
                  value={generalRemarks}
                  onChange={(e) => setGeneralRemarks(e.target.value)}
                />
              </label>
              <div className="flex flex-wrap gap-2.5 pt-2 border-t border-zinc-200">
                <Button 
                  type="button" 
                  variant="secondary" 
                  className="rounded-lg shadow-sm font-bold cursor-pointer hover:bg-zinc-100"
                  onClick={saveDayFields}
                >
                  {isSubmitted ? "Save day modifications" : "Save day details"}
                </Button>
                {isDraft && (
                  <Button 
                    type="button" 
                    className="rounded-lg font-bold py-2.5 px-6 shadow-md active:scale-[0.98] transition-all bg-emerald-800 text-white hover:bg-emerald-900 cursor-pointer"
                    onClick={submitDay}
                  >
                    Submit {reportDate} to HQ
                  </Button>
                )}
              </div>
            </div>
          </TabPanel>
        </div>
      </div>
    </div>
  );
}
