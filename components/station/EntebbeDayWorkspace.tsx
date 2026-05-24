"use client";

import { useCallback, useEffect, useState } from "react";
import { NationalitySelect } from "@/components/forms/NationalitySelect";
import { useAppPreferences } from "@/components/providers/AppPreferencesProvider";
import { EntebbeSummaryTable } from "@/components/station/EntebbeSummaryTable";
import type { DayData, DailyEntryRow } from "@/components/station/shared-day-types";
import { Button } from "@/components/ui/button";
import { Tabs, TabPanel } from "@/components/ui/tabs";
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

      {message && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-950">
          {message}
        </p>
      )}

      <div className="rounded-lg border border-zinc-300 shadow-sm">
        <Tabs
          tabs={workTabs}
          active={workTab}
          onChange={(id) => setWorkTab(id as WorkTabId)}
        />

        {workTab === "entry" && (
          <TabPanel>
            {isSubmitted && (
              <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                Day submitted — new records need HQ approval unless you are an
                admin.
              </div>
            )}
            {!canAddNew && isSubmitted && (
              <p className="text-sm text-zinc-700">
                Only edits to existing records are allowed (use Activity log).
              </p>
            )}
            {(canAddNew || editingEntryId) && (
              <form onSubmit={saveEntry} className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {AIR_MODULE_GROUPS.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => selectModule(g.id)}
                      className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                        airModule === g.id
                          ? "border-emerald-800 bg-emerald-800 text-white"
                          : "border-zinc-300 bg-zinc-50"
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>

                {airModule === "flights" && (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {(["flight_arrival", "flight_departure"] as const).map(
                        (t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setEntryType(t)}
                            className={`rounded border px-3 py-2 text-sm font-semibold ${
                              entryType === t
                                ? "border-emerald-800 bg-emerald-800 text-white"
                                : "border-zinc-300"
                            }`}
                          >
                            {ENTRY_LABELS[t]}
                          </button>
                        ),
                      )}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <label className="text-sm font-semibold">Shift</label>
                        <select
                          className="mt-1 w-full rounded border border-zinc-400 px-3 py-2"
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
                        <label className="text-sm font-semibold">
                          Flight no.
                        </label>
                        <input
                          className="mt-1 w-full rounded border border-zinc-400 px-3 py-2 uppercase"
                          value={flightNumber}
                          onChange={(e) => setFlightNumber(e.target.value)}
                          placeholder="ET338"
                          required
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-sm font-semibold">
                          {entryType === "flight_arrival"
                            ? "From (city)"
                            : "To (city)"}
                        </label>
                        <input
                          className="mt-1 w-full rounded border border-zinc-400 px-3 py-2"
                          value={route}
                          onChange={(e) => setRoute(e.target.value)}
                          placeholder="Addis Ababa"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold">
                          Passengers
                        </label>
                        <input
                          type="number"
                          min={1}
                          className="mt-1 w-full rounded border border-zinc-400 px-3 py-2"
                          value={male}
                          onChange={(e) => setMale(Number(e.target.value) || 0)}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold">Time</label>
                        <input
                          type="datetime-local"
                          className="mt-1 w-full rounded border border-zinc-400 px-3 py-2"
                          value={recordedAt}
                          onChange={(e) => setRecordedAt(e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                )}

                {airModule === "deportees" && (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {(["deportee", "returned_person"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setEntryType(t)}
                          className={`rounded border px-3 py-2 text-sm font-semibold ${
                            entryType === t
                              ? "border-emerald-800 bg-emerald-800 text-white"
                              : "border-zinc-300"
                          }`}
                        >
                          {ENTRY_LABELS[t]}
                        </button>
                      ))}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-sm font-semibold">Name</label>
                        <input
                          className="mt-1 w-full rounded border border-zinc-400 px-3 py-2"
                          value={personName}
                          onChange={(e) => setPersonName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold">
                          Passport no.
                        </label>
                        <input
                          className="mt-1 w-full rounded border border-zinc-400 px-3 py-2"
                          value={passportNo}
                          onChange={(e) => setPassportNo(e.target.value)}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-sm font-semibold">
                          Nationality (optional)
                        </label>
                        <NationalitySelect
                          value={nationalityCode}
                          onChange={setNationalityCode}
                          optional
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-sm font-semibold">
                          Case details
                        </label>
                        <textarea
                          className="mt-1 w-full rounded border border-zinc-400 px-3 py-2"
                          rows={3}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Reason for deportation / return…"
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                {airModule === "denied" && (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {(["offloaded", "denied_entry"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setEntryType(t)}
                          className={`rounded border px-3 py-2 text-sm font-semibold ${
                            entryType === t
                              ? "border-emerald-800 bg-emerald-800 text-white"
                              : "border-zinc-300"
                          }`}
                        >
                          {ENTRY_LABELS[t]}
                        </button>
                      ))}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-sm font-semibold">Name</label>
                        <input
                          className="mt-1 w-full rounded border border-zinc-400 px-3 py-2"
                          value={personName}
                          onChange={(e) => setPersonName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold">
                          Passport no.
                        </label>
                        <input
                          className="mt-1 w-full rounded border border-zinc-400 px-3 py-2"
                          value={passportNo}
                          onChange={(e) => setPassportNo(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold">
                          Flight (optional)
                        </label>
                        <input
                          className="mt-1 w-full rounded border border-zinc-400 px-3 py-2 uppercase"
                          value={flightNumber}
                          onChange={(e) => setFlightNumber(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold">
                          Nationality (optional)
                        </label>
                        <NationalitySelect
                          value={nationalityCode}
                          onChange={setNationalityCode}
                          optional
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-sm font-semibold">Details</label>
                        <textarea
                          className="mt-1 w-full rounded border border-zinc-400 px-3 py-2"
                          rows={3}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                {isSubmitted && !isAdmin && editingEntryId && (
                  <input
                    className="w-full rounded border border-zinc-400 px-3 py-2"
                    placeholder="Correction reason (required)"
                    value={correctionReason}
                    onChange={(e) => setCorrectionReason(e.target.value)}
                  />
                )}

                <div className="flex flex-wrap gap-2">
                  <Button type="submit">
                    {editingEntryId ? "Save changes" : "Save record"}
                  </Button>
                  {editingEntryId && (
                    <Button type="button" variant="secondary" onClick={() => {
                      setEditingEntryId(null);
                      resetEntryForm();
                    }}>
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            )}
          </TabPanel>
        )}

        {workTab === "log" && (
          <TabPanel>
            {loading ? (
              <p className="text-sm text-zinc-600">Loading…</p>
            ) : (
              <div className="space-y-6">
                <div>
                  <h4 className="mb-2 text-sm font-bold text-zinc-900">
                    Entries
                  </h4>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-zinc-100 text-left">
                        <th className="p-2">Time</th>
                        <th className="p-2">Record</th>
                        <th className="p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedEntries.map((e) => (
                        <tr key={e.id} className="border-b">
                          <td className="p-2">{formatTime(e.recordedAt)}</td>
                          <td className="p-2">{entryLabel(e)}</td>
                          <td className="p-2">
                            <div className="flex gap-2">
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
                <div>
                  <h4 className="mb-2 text-sm font-bold text-zinc-900">
                    Occurrences
                  </h4>
                  {(data?.incidents ?? []).length === 0 ? (
                    <p className="text-sm text-zinc-600">None logged.</p>
                  ) : (
                    <ul className="space-y-2">
                      {(data?.incidents ?? []).map((i) => (
                        <li
                          key={i.id}
                          className="rounded border border-zinc-200 p-3 text-sm"
                        >
                          <span className="font-semibold uppercase text-zinc-700">
                            {i.incidentType?.replace("occurrence_", "Shift ") ??
                              "Occurrence"}
                          </span>
                          <p className="mt-1">{i.description}</p>
                          {isDraft && (
                            <button
                              type="button"
                              className="mt-2 text-xs font-semibold text-red-700"
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
        )}

        {workTab === "occurrences" && (
          <TabPanel>
            {isSubmitted ? (
              <p className="text-sm text-zinc-700">
                Add new occurrences via HQ correction workflow (not yet on
                submitted days). Edit day remarks on Submit tab.
              </p>
            ) : (
              <form onSubmit={addOccurrence} className="space-y-4 max-w-xl">
                <div className="flex gap-2">
                  {(["day", "night"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setOccShift(s)}
                      className={`rounded border px-3 py-2 text-sm font-semibold ${
                        occShift === s
                          ? "border-emerald-800 bg-emerald-800 text-white"
                          : "border-zinc-300"
                      }`}
                    >
                      {s === "day" ? "Day shift" : "Night shift"}
                    </button>
                  ))}
                </div>
                <textarea
                  className="w-full rounded border border-zinc-400 px-3 py-2"
                  rows={4}
                  placeholder="Occurrence narrative (or NIL)"
                  value={occDescription}
                  onChange={(e) => setOccDescription(e.target.value)}
                  required
                />
                <input
                  className="w-full rounded border border-zinc-400 px-3 py-2"
                  placeholder="Passport no. (optional)"
                  value={occPassport}
                  onChange={(e) => setOccPassport(e.target.value)}
                />
                <input
                  className="w-full rounded border border-zinc-400 px-3 py-2"
                  placeholder="Person name (optional)"
                  value={occName}
                  onChange={(e) => setOccName(e.target.value)}
                />
                <Button type="submit">Log occurrence</Button>
              </form>
            )}
          </TabPanel>
        )}

        {workTab === "totals" && data?.summary?.air && (
          <TabPanel className="border-0 bg-transparent p-0 shadow-none">
            <EntebbeSummaryTable
              stationName={data.station?.name ?? "ENTEBBE"}
              reportDate={reportDate}
              air={data.summary.air}
              inadmissibleCount={data.inadmissibleCount ?? 0}
              incidentCount={data.incidents?.length ?? 0}
            />
          </TabPanel>
        )}

        {workTab === "day" && (
          <TabPanel>
            <div className="space-y-4 max-w-2xl">
              <label className="block text-sm">
                <span className="font-semibold">Staff on duty</span>
                <input
                  type="number"
                  min={0}
                  className="mt-1 w-full max-w-xs rounded border border-zinc-400 px-3 py-2"
                  value={staffOnDuty}
                  onChange={(e) =>
                    setStaffOnDuty(Number(e.target.value) || 0)
                  }
                />
              </label>
              <label className="block text-sm">
                <span className="font-semibold">Staff on leave (by shift)</span>
                <textarea
                  className="mt-1 w-full rounded border border-zinc-400 px-3 py-2"
                  rows={3}
                  value={staffLeaveNotes}
                  onChange={(e) => setStaffLeaveNotes(e.target.value)}
                  placeholder="Shift D: … Shift B: …"
                />
              </label>
              <label className="block text-sm">
                <span className="font-semibold">Inadmissible count</span>
                <input
                  type="number"
                  min={0}
                  className="mt-1 w-full max-w-xs rounded border border-zinc-400 px-3 py-2"
                  value={inadmissibleCount}
                  onChange={(e) =>
                    setInadmissibleCount(Number(e.target.value) || 0)
                  }
                />
              </label>
              <label className="block text-sm">
                <span className="font-semibold">Urgent matters</span>
                <textarea
                  className="mt-1 w-full rounded border border-zinc-400 px-3 py-2"
                  rows={2}
                  value={urgentMatters}
                  onChange={(e) => setUrgentMatters(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                <span className="font-semibold">General remarks</span>
                <textarea
                  className="mt-1 w-full rounded border border-zinc-400 px-3 py-2"
                  rows={2}
                  value={generalRemarks}
                  onChange={(e) => setGeneralRemarks(e.target.value)}
                />
              </label>
              <div className="flex flex-wrap gap-3">
                <Button type="button" variant="secondary" onClick={saveDayFields}>
                  {isSubmitted ? "Save day modifications" : "Save day details"}
                </Button>
                {isDraft && (
                  <Button type="button" onClick={submitDay}>
                    Submit {reportDate} to HQ
                  </Button>
                )}
              </div>
            </div>
          </TabPanel>
        )}
      </div>
    </div>
  );
}
