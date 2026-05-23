"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ConsolidatedClient() {
  const [date, setDate] = useState("2026-05-08");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    const res = await fetch(
      `/api/reports/generate/consolidated?date=${date}`,
      { method: "POST" },
    );
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setText(data.error ?? "Generation failed");
      return;
    }
    setText(data.consolidated);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4 shadow-sm">
        <label className="text-sm">
          Report date
          <input
            type="date"
            className="mt-1 block rounded border px-3 py-2"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <Button type="button" onClick={generate} disabled={loading}>
          {loading ? "Generating…" : "Generate consolidated SITREP"}
        </Button>
      </div>
      <pre className="overflow-auto rounded-lg border bg-zinc-900 p-4 text-sm text-white whitespace-pre-wrap">
        {text || "Generated consolidated text will appear here."}
      </pre>
    </div>
  );
}
