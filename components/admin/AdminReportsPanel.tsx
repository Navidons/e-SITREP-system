"use client";

import { useState } from "react";
import { HqReviewInbox } from "@/components/hq/HqReviewInbox";
import { ConsolidatedClient } from "@/components/hq/ConsolidatedClient";
import { Tabs, TabPanel } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export function AdminReportsPanel() {
  const [tab, setTab] = useState<"review" | "consolidated">("review");

  const tabs = [
    { id: "review" as const, label: "Review & preview" },
    { id: "consolidated" as const, label: "Consolidated SITREP" },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600 leading-relaxed">
        Preview station data before review, verification, or approval. Rejections require
        a reason — stations see it on their day record and can amend and resubmit.
        Consolidated SITREP: load approved stations for a date, export an Excel table.
      </p>
      
      <Tabs tabs={tabs} active={tab} onChange={(id) => setTab(id as typeof tab)} />
      
      {/* Review Inbox Persistent Panel */}
      <div className={cn(tab !== "review" && "hidden")}>
        <TabPanel>
          <HqReviewInbox />
        </TabPanel>
      </div>
      
      {/* Consolidated SITREP Persistent Panel */}
      <div className={cn(tab !== "consolidated" && "hidden")}>
        <TabPanel>
          <ConsolidatedClient />
        </TabPanel>
      </div>
    </div>
  );
}
