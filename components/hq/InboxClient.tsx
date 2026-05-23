"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Report = {
  id: number;
  status: string;
  reportDate: string;
  station: { name: string; code: string };
};

export function InboxClient() {
  const [reports, setReports] = useState<Report[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/reports/pending");
    setReports(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function action(id: number, step: string) {
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

  return (
    <div className="space-y-4">
      {message && (
        <p className="rounded bg-blue-50 px-3 py-2 text-sm">{message}</p>
      )}
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
                <td colSpan={4} className="p-6 text-center font-medium text-zinc-700">
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
                    <Button size="sm" onClick={() => action(r.id, "review")}>
                      Review
                    </Button>
                  )}
                  {r.status === "reviewed" && (
                    <Button size="sm" onClick={() => action(r.id, "verify")}>
                      Verify
                    </Button>
                  )}
                  {r.status === "verified" && (
                    <Button size="sm" onClick={() => action(r.id, "approve")}>
                      Approve
                    </Button>
                  )}
                  {r.status !== "draft" && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => action(r.id, "reject")}
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
    </div>
  );
}
