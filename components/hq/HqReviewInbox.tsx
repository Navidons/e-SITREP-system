"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { LoadingBlock, TableSkeleton } from "@/components/ui/loading";
import { ReportPreviewPanel } from "@/components/hq/ReportPreviewPanel";
import type { DayData } from "@/components/station/shared-day-types";

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

type RejectTarget =
  | { kind: "report"; id: number; label: string }
  | { kind: "amendment"; id: number; label: string };

export function HqReviewInbox() {
  const [reports, setReports] = useState<Report[]>([]);
  const [amendments, setAmendments] = useState<Amendment[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [preview, setPreview] = useState<DayData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<RejectTarget | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [inboxLoading, setInboxLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);

  const load = useCallback(async () => {
    setInboxLoading(true);
    try {
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
    } finally {
      setInboxLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadPreview = useCallback(async (reportId: number) => {
    setPreviewId(reportId);
    setPreviewLoading(true);
    setPreview(null);
    const res = await fetch(`/api/reports/${reportId}`);
    if (res.ok) {
      setPreview(await res.json());
    }
    setPreviewLoading(false);
  }, []);

  async function reportAction(
    id: number,
    step: string,
    comment?: string,
  ) {
    setActionBusy(true);
    try {
      const res = await fetch(`/api/reports/${id}/${step}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: comment ?? "" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Action failed");
        if (data.requiresComment && step === "reject") {
          const r = reports.find((x) => x.id === id);
          setRejectTarget({
            kind: "report",
            id,
            label: r ? `${r.station.name} ${r.reportDate}` : `Report ${id}`,
          });
        }
        return;
      }
      setMessage(`${step} completed for ${data.station?.name ?? "report"}`);
      setRejectTarget(null);
      setRejectReason("");
      if (previewId === id) {
        await loadPreview(id);
      }
      load();
    } finally {
      setActionBusy(false);
    }
  }

  async function submitReject() {
    if (!rejectTarget || !rejectReason.trim()) {
      setMessage("Rejection reason is required.");
      return;
    }
    if (rejectTarget.kind === "report") {
      await reportAction(rejectTarget.id, "reject", rejectReason.trim());
    } else {
      setActionBusy(true);
      try {
        const res = await fetch(
          `/api/reports/amendments/${rejectTarget.id}/reject`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ comment: rejectReason.trim() }),
          },
        );
        const data = await res.json();
        if (!res.ok) {
          setMessage(data.error ?? "Reject failed");
          return;
        }
        setMessage(data.message ?? "Correction rejected.");
        setRejectTarget(null);
        setRejectReason("");
        load();
      } finally {
        setActionBusy(false);
      }
    }
  }

  async function amendmentApprove(id: number) {
    setActionBusy(true);
    try {
    const res = await fetch(`/api/reports/amendments/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment: "" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Action failed");
      return;
    }
    setMessage(data.message ?? "Correction approved. Totals reconciled.");
    if (previewId) await loadPreview(previewId);
    load();
    } finally {
      setActionBusy(false);
    }
  }

  const selected = reports.find((r) => r.id === previewId);

  return (
    <div className="space-y-6">
      {message && (
        <Alert
          variant={
            message.toLowerCase().includes("fail") ||
            message.toLowerCase().includes("required")
              ? "error"
              : "success"
          }
          onDismiss={() => setMessage(null)}
        >
          {message}
        </Alert>
      )}

      {rejectTarget && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 space-y-3">
          <h3 className="font-semibold text-red-950">
            Rejection reason required — {rejectTarget.label}
          </h3>
          <textarea
            className="w-full rounded border border-red-300 px-3 py-2 text-sm"
            rows={3}
            placeholder="Explain what must be corrected…"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="danger" onClick={submitReject} loading={actionBusy}>
              Confirm reject
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setRejectTarget(null);
                setRejectReason("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {inboxLoading ? (
        <LoadingBlock message="Loading inbox from database…" />
      ) : (
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">
              Pending corrections
            </h2>
            <p className="mb-3 text-sm text-zinc-700">
              Preview the day, then approve or reject with a reason. Stations
              are notified when a correction is rejected.
            </p>
            <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 text-left">
                  <tr>
                    <th className="p-3">Station / date</th>
                    <th className="p-3">Change</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {amendments.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-6 text-center text-zinc-700">
                        No pending corrections
                      </td>
                    </tr>
                  )}
                  {amendments.map((a) => (
                    <tr key={a.id} className="border-t">
                      <td className="p-3">
                        <p className="font-semibold">{a.station.name}</p>
                        <p className="text-xs text-zinc-600">{a.reportDate}</p>
                      </td>
                      <td className="p-3">
                        <p>{a.summary}</p>
                        <p className="text-xs text-zinc-600 mt-1">
                          {a.reason}
                        </p>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={actionBusy}
                            onClick={() => loadPreview(a.reportId)}
                          >
                            Preview
                          </Button>
                          <Button
                            size="sm"
                            loading={actionBusy}
                            onClick={() => amendmentApprove(a.id)}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() =>
                              setRejectTarget({
                                kind: "amendment",
                                id: a.id,
                                label: `${a.station.name} correction`,
                              })
                            }
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
                      <td colSpan={4} className="p-6 text-center text-zinc-700">
                        No pending reports
                      </td>
                    </tr>
                  )}
                  {reports.map((r) => (
                    <tr
                      key={r.id}
                      className={`border-t ${previewId === r.id ? "bg-emerald-50" : ""}`}
                    >
                      <td className="p-3">{r.station.name}</td>
                      <td className="p-3">
                        {new Date(r.reportDate).toISOString().slice(0, 10)}
                      </td>
                      <td className="p-3 uppercase">{r.status}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => loadPreview(r.id)}
                          >
                            Preview
                          </Button>
                          {r.status === "submitted" && (
                            <Button
                              size="sm"
                              loading={actionBusy}
                              disabled={actionBusy}
                              onClick={() => reportAction(r.id, "review")}
                            >
                              Review
                            </Button>
                          )}
                          {r.status === "reviewed" && (
                            <Button
                              size="sm"
                              loading={actionBusy}
                              disabled={actionBusy}
                              onClick={() => reportAction(r.id, "verify")}
                            >
                              Verify
                            </Button>
                          )}
                          {r.status === "verified" && (
                            <Button
                              size="sm"
                              loading={actionBusy}
                              disabled={actionBusy}
                              onClick={() => reportAction(r.id, "approve")}
                            >
                              Approve
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() =>
                              setRejectTarget({
                                kind: "report",
                                id: r.id,
                                label: `${r.station.name} ${r.reportDate}`,
                              })
                            }
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
        </div>

        <div className="rounded-lg border border-zinc-300 bg-white p-4 shadow-sm lg:sticky lg:top-4 lg:self-start">
          <h2 className="mb-3 text-lg font-semibold text-zinc-900">
            Report preview
          </h2>
          {selected && (
            <p className="mb-3 text-sm text-zinc-600">
              {selected.station.name} · {selected.reportDate} ·{" "}
              <span className="uppercase">{selected.status}</span>
            </p>
          )}
          <ReportPreviewPanel data={preview} loading={previewLoading} />
          {selected && !previewLoading && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-200 pt-4">
              {selected.status === "submitted" && (
                <Button
                  size="sm"
                  loading={actionBusy}
                  disabled={actionBusy}
                  onClick={() => reportAction(selected.id, "review")}
                >
                  Review
                </Button>
              )}
              {selected.status === "reviewed" && (
                <Button
                  size="sm"
                  loading={actionBusy}
                  disabled={actionBusy}
                  onClick={() => reportAction(selected.id, "verify")}
                >
                  Verify
                </Button>
              )}
              {selected.status === "verified" && (
                <Button
                  size="sm"
                  loading={actionBusy}
                  disabled={actionBusy}
                  onClick={() => reportAction(selected.id, "approve")}
                >
                  Approve
                </Button>
              )}
              <Button
                size="sm"
                variant="danger"
                onClick={() =>
                  setRejectTarget({
                    kind: "report",
                    id: selected.id,
                    label: `${selected.station.name} ${selected.reportDate}`,
                  })
                }
              >
                Reject with reason
              </Button>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
