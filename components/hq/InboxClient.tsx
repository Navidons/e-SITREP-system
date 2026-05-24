"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Report = {
  id: number;
  status: string;
  reportDate: string;
  station: { name: string; code: string };
};

type Amendment = {
  id: number;
  action: string;
  summary: string;
  reason: string | null;
  createdAt: string;
  reportId: number;
  reportStatus: string;
  reportDate: string;
  station: { name: string; code: string };
  requestedBy: { fullName: string; username: string };
};

export function InboxClient() {
  const [reports, setReports] = useState<Report[]>([]);
  const [amendments, setAmendments] = useState<Amendment[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const [reportsRes, amendmentsRes] = await Promise.all([
      fetch("/api/reports/pending"),
      fetch("/api/reports/amendments/pending"),
    ]);
    setReports(await reportsRes.json());
    if (amendmentsRes.ok) {
      setAmendments(await amendmentsRes.json());
    } else {
      setAmendments([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function reportAction(id: number, step: string) {
    const res = await fetch(`/api/reports/${id}/${step}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment: "" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Action failed");
      return;
    }
    setMessage(`${step} completed for ${data.station?.name ?? "report"}`);
    load();
  }

  async function amendmentAction(id: number, step: "approve" | "reject") {
    const comment =
      step === "reject"
        ? prompt("Reason for rejecting this correction (optional):") ?? ""
        : "";
    const res = await fetch(`/api/reports/amendments/${id}/${step}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Action failed");
      return;
    }
    setMessage(data.message ?? `Correction ${step}d.`);
    load();
  }

  return (
    <div className="space-y-8">
      {message && (
        <p className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-950">
          {message}
        </p>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold text-zinc-900">
          Pending corrections
        </h2>
        <p className="mb-3 text-sm text-zinc-700">
          Station changes to submitted days apply only after you approve them.
          Day totals reconcile automatically.
        </p>
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left">
              <tr>
                <th className="p-3">Station / date</th>
                <th className="p-3">Change</th>
                <th className="p-3">Reason</th>
                <th className="p-3">Report status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {amendments.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-6 text-center font-medium text-zinc-700"
                  >
                    No pending corrections
                  </td>
                </tr>
              )}
              {amendments.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="p-3">
                    <p className="font-semibold text-zinc-900">
                      {a.station.name}
                    </p>
                    <p className="text-xs text-zinc-600">
                      {a.reportDate} · {a.requestedBy.fullName}
                    </p>
                  </td>
                  <td className="p-3 text-zinc-800">{a.summary}</td>
                  <td className="p-3 max-w-xs text-zinc-700">{a.reason ?? "—"}</td>
                  <td className="p-3 uppercase text-zinc-700">
                    {a.reportStatus}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => amendmentAction(a.id, "approve")}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => amendmentAction(a.id, "reject")}
                      >
                        Reject
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-zinc-900">
          Report workflow
        </h2>
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left">
              <tr>
                <th className="p-3">Station</th>
                <th className="p-3">Date</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="p-6 text-center font-medium text-zinc-700"
                  >
                    No pending reports
                  </td>
                </tr>
              )}
              {reports.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3">
                    {r.station.name} ({r.station.code})
                  </td>
                  <td className="p-3">
                    {new Date(r.reportDate).toISOString().slice(0, 10)}
                  </td>
                  <td className="p-3 uppercase">{r.status}</td>
                  <td className="p-3 flex flex-wrap gap-2">
                    {r.status === "submitted" && (
                      <Button
                        size="sm"
                        onClick={() => reportAction(r.id, "review")}
                      >
                        Review
                      </Button>
                    )}
                    {r.status === "reviewed" && (
                      <Button
                        size="sm"
                        onClick={() => reportAction(r.id, "verify")}
                      >
                        Verify
                      </Button>
                    )}
                    {r.status === "verified" && (
                      <Button
                        size="sm"
                        onClick={() => reportAction(r.id, "approve")}
                      >
                        Approve
                      </Button>
                    )}
                    {r.status !== "draft" && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => reportAction(r.id, "reject")}
                      >
                        Reject
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
