"use client";

import { useCallback, useEffect, useState } from "react";
import { DayRecordWorkspace } from "@/components/station/DayRecordWorkspace";
import { EntebbeDayWorkspace } from "@/components/station/EntebbeDayWorkspace";
import {
  getReportingProfile,
  ReportingProfile,
} from "@/lib/station/entry-config";

export function DayRecordRouter({
  reportDate,
  isToday,
  isAdmin = false,
}: {
  reportDate: string;
  isToday: boolean;
  isAdmin?: boolean;
}) {
  const [profile, setProfile] = useState<ReportingProfile | null>(null);

  const detectProfile = useCallback(async () => {
    const res = await fetch(`/api/reports/daily?date=${reportDate}`);
    const json = await res.json();
    setProfile(getReportingProfile(json.station));
  }, [reportDate]);

  useEffect(() => {
    detectProfile();
  }, [detectProfile]);

  if (profile === null) {
    return (
      <p className="text-sm font-medium text-zinc-600">Loading station form…</p>
    );
  }

  if (profile === ReportingProfile.air) {
    return (
      <EntebbeDayWorkspace
        reportDate={reportDate}
        isToday={isToday}
        isAdmin={isAdmin}
      />
    );
  }

  return (
    <DayRecordWorkspace
      reportDate={reportDate}
      isToday={isToday}
      isAdmin={isAdmin}
    />
  );
}
