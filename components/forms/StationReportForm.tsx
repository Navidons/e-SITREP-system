"use client";

import { useEffect, useState } from "react";
import { MovementTable } from "@/components/forms/MovementTable";
import { Button } from "@/components/ui/button";
import { LoadingOverlay } from "@/components/ui/loading";
import type { DailyReportPayload, MovementInput } from "@/types/reports";
import { formatDateInput } from "@/lib/utils";

const DEFAULT_DATE = "2026-05-08";

export function StationReportForm() {
  const [reportDate, setReportDate] = useState(DEFAULT_DATE);
  const [movements, setMovements] = useState<MovementInput[]>([]);
  const [asylumMale, setAsylumMale] = useState(0);
  const [asylumFemale, setAsylumFemale] = useState(0);
  const [staffOnDuty, setStaffOnDuty] = useState(0);
  const [medicalScreening, setMedicalScreening] = useState("");
  const [generalRemarks, setGeneralRemarks] = useState("");
  const [urgentMatters, setUrgentMatters] = useState("");
  const [status, setStatus] = useState<string>("draft");
  const [reportId, setReportId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const readOnly = status !== "draft" && status !== "rejected";

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch(`/api/reports/daily?date=${reportDate}`);
      const data = await res.json();
      setLoading(false);
      if (!data || data.error) {
        setMovements([]);
        setReportId(null);
        setStatus("draft");
        return;
      }
      setReportId(data.id);
      setStatus(data.status);
      setMovements(
        data.movements.map(
          (m: {
            movementType: string;
            nationalityCode: string;
            male: number;
            female: number;
          }) => ({
            movementType: m.movementType,
            nationalityCode: m.nationalityCode,
            male: m.male,
            female: m.female,
          }),
        ),
      );
      const asylum = data.specialCategories?.find((s: { category: string }) =>
        s.category.includes("asylum"),
      );
      setAsylumMale(asylum?.male ?? 0);
      setAsylumFemale(asylum?.female ?? 0);
      setStaffOnDuty(data.staffOnDuty ?? 0);
      setMedicalScreening(data.medicalScreening ?? "");
      setGeneralRemarks(data.generalRemarks ?? "");
      setUrgentMatters(data.urgentMatters ?? "");
    }
    load();
  }, [reportDate]);

  function buildPayload(): DailyReportPayload {
    return {
      reportDate,
      staffOnDuty,
      medicalScreening,
      generalRemarks,
      urgentMatters,
      movements,
      specialCategories:
        asylumMale + asylumFemale > 0
          ? [
              {
                category: "asylum_seekers",
                male: asylumMale,
                female: asylumFemale,
              },
            ]
          : [],
      incidents: [],
    };
  }

  async function saveDraft() {
    setMessage(null);
    const res = await fetch("/api/reports/daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload()),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Save failed");
      return;
    }
    setReportId(data.id);
    setStatus(data.status);
    setMessage("Draft saved.");
  }

  async function submitReport() {
    setMessage(null);
    const saveRes = await fetch("/api/reports/daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload()),
    });
    const saved = await saveRes.json();
    if (!saveRes.ok) {
      setMessage(saved.error ?? "Save failed");
      return;
    }
    const id = saved.id as number;
    setReportId(id);
    const res = await fetch(`/api/reports/${id}/submit`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Submit failed");
      return;
    }
    setStatus(data.status);
    setMessage("Report submitted for HQ review.");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-sm font-medium">Report date</label>
          <input
            type="date"
            className="rounded border px-3 py-2"
            value={reportDate}
            max={formatDateInput(new Date())}
            onChange={(e) => setReportDate(e.target.value)}
          />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-700">Status</p>
          <p className="font-semibold uppercase text-emerald-800">{status}</p>
        </div>
      </div>

      <div className="relative space-y-6">
        {loading && <LoadingOverlay message="Loading report…" />}
      <MovementTable
        title="Arrivals"
        movementType="arrival"
        rows={movements}
        onChange={setMovements}
        readOnly={readOnly}
      />
      <MovementTable
        title="Departures"
        movementType="departure"
        rows={movements}
        onChange={setMovements}
        readOnly={readOnly}
      />

      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-lg font-semibold">Asylum seekers</h3>
        <div className="flex gap-4">
          <label className="text-sm">
            Male
            <input
              type="number"
              min={0}
              readOnly={readOnly}
              className="ml-2 w-24 rounded border px-2 py-1"
              value={asylumMale}
              onChange={(e) => setAsylumMale(Number(e.target.value) || 0)}
            />
          </label>
          <label className="text-sm">
            Female
            <input
              type="number"
              min={0}
              readOnly={readOnly}
              className="ml-2 w-24 rounded border px-2 py-1"
              value={asylumFemale}
              onChange={(e) => setAsylumFemale(Number(e.target.value) || 0)}
            />
          </label>
          <p className="text-sm font-medium">
            Total: {asylumMale + asylumFemale}
          </p>
        </div>
      </section>

      <section className="rounded-lg border bg-white p-4 shadow-sm space-y-3">
        <h3 className="text-lg font-semibold">Remarks</h3>
        <label className="block text-sm">
          Staff on duty
          <input
            type="number"
            min={0}
            readOnly={readOnly}
            className="mt-1 w-full rounded border px-3 py-2"
            value={staffOnDuty}
            onChange={(e) => setStaffOnDuty(Number(e.target.value) || 0)}
          />
        </label>
        <label className="block text-sm">
          Medical screening
          <textarea
            readOnly={readOnly}
            className="mt-1 w-full rounded border px-3 py-2"
            rows={2}
            value={medicalScreening}
            onChange={(e) => setMedicalScreening(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          General remarks
          <textarea
            readOnly={readOnly}
            className="mt-1 w-full rounded border px-3 py-2"
            rows={2}
            value={generalRemarks}
            onChange={(e) => setGeneralRemarks(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          Urgent matters
          <textarea
            readOnly={readOnly}
            className="mt-1 w-full rounded border px-3 py-2"
            rows={2}
            value={urgentMatters}
            onChange={(e) => setUrgentMatters(e.target.value)}
          />
        </label>
      </section>

      {message && (
        <p className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {message}
        </p>
      )}

      {!readOnly && (
        <div className="flex gap-3">
          <Button type="button" onClick={saveDraft}>
            Save draft
          </Button>
          <Button type="button" variant="secondary" onClick={submitReport}>
            Submit for review
          </Button>
        </div>
      )}
      </div>
    </div>
  );
}
