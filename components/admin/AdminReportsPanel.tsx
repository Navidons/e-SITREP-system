"use client";

import { useState } from "react";
import { HqReviewInbox } from "@/components/hq/HqReviewInbox";
import { ConsolidatedClient } from "@/components/hq/ConsolidatedClient";
import { WeeklyExportClient } from "@/components/weekly/WeeklyExportClient";
import { TabGroup } from "@/components/ui/tabs";

export function AdminReportsPanel() {
  const [tab, setTab] = useState<"review" | "consolidated" | "weekly">("review");

  const tabs = [
    { id: "review" as const, label: "Review & preview" },
    { id: "consolidated" as const, label: "Consolidated SITREP" },
    { id: "weekly" as const, label: "Weekly matrix" },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-700">
        Preview station data before review, verify, or approve. Export consolidated
        daily SITREP or a 7-day weekly matrix (NCIC layout).
      </p>
      <TabGroup
        tabs={tabs}
        active={tab}
        onChange={(id) => setTab(id as typeof tab)}
        minHeight="min-h-[28rem]"
      >
        <TabGroup.Panel id="review">
          <HqReviewInbox />
        </TabGroup.Panel>
        <TabGroup.Panel id="consolidated" className="border-0 p-0 shadow-none">
          <ConsolidatedClient />
        </TabGroup.Panel>
        <TabGroup.Panel id="weekly" className="border-0 p-0 shadow-none">
          <WeeklyExportClient />
        </TabGroup.Panel>
      </TabGroup>
    </div>
  );
}
