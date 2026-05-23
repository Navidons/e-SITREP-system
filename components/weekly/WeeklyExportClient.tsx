"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function WeeklyExportClient() {
  const [from, setFrom] = useState("2026-05-02");
  const [to, setTo] = useState("2026-05-08");

  function download() {
    window.location.href = `/api/exports/weekly?from=${from}&to=${to}`;
  }

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm space-y-4 max-w-lg">
      <p className="text-sm text-zinc-600">
        Export approved station arrival totals as an Excel matrix (stations ×
        days).
      </p>
      <label className="block text-sm">
        From
        <input
          type="date"
          className="mt-1 block w-full rounded border px-3 py-2"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
      </label>
      <label className="block text-sm">
        To
        <input
          type="date"
          className="mt-1 block w-full rounded border px-3 py-2"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </label>
      <Button type="button" onClick={download}>
        Download weekly Excel
      </Button>
    </div>
  );
}
