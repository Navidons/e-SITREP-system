"use client";

import { useEffect, useState } from "react";
import { Drawer, DrawerToggle, useDrawer } from "@/components/layout/Drawer";
import { DayRecordWorkspace } from "@/components/station/DayRecordWorkspace";
import { PreviousDaysPanel } from "@/components/station/PreviousDaysPanel";
import { formatDateInput, cn } from "@/lib/utils";

function todayString() {
  return formatDateInput(new Date());
}

export function StationInputterApp() {
  const today = todayString();
  const [view, setView] = useState<"today" | "history">("today");
  const [selectedDate, setSelectedDate] = useState(today);
  const [todayMeta, setTodayMeta] = useState(today);
  const daysDrawer = useDrawer("station-days", true);

  useEffect(() => {
    fetch("/api/reports/daily/list?meta=1")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.today) setTodayMeta(json.today);
      })
      .catch(() => {});
  }, []);

  const activeDate = view === "today" ? todayMeta : selectedDate;

  function openDay(date: string) {
    setSelectedDate(date);
    setView("history");
    if (window.matchMedia("(max-width: 1023px)").matches) {
      daysDrawer.setOpen(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <DrawerToggle
          label="Daily records"
          active={daysDrawer.open}
          onClick={() => daysDrawer.setOpen(!daysDrawer.open)}
        />
        <p className="text-sm font-medium text-zinc-700">
          Working on{" "}
          <span className="font-semibold text-zinc-900">{activeDate}</span>
          {activeDate === todayMeta ? " (today)" : ""}
        </p>
      </div>

      <div className="flex items-start gap-4 lg:gap-6">
        <Drawer
          id="station-days"
          title="Daily records"
          subtitle="One folder per calendar day"
          open={daysDrawer.open}
          onOpenChange={daysDrawer.setOpen}
          widthClass="w-72"
        >
          <nav className="shrink-0 space-y-1 border-b border-zinc-100 p-2">
            <button
              type="button"
              onClick={() => setView("today")}
              className={cn(
                "w-full rounded-md px-3 py-2.5 text-left text-sm font-semibold",
                view === "today"
                  ? "bg-emerald-800 text-white"
                  : "text-zinc-900 hover:bg-zinc-100",
              )}
            >
              Today
              <span className="mt-0.5 block text-xs font-normal opacity-90">
                {todayMeta}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setView("history")}
              className={cn(
                "w-full rounded-md px-3 py-2.5 text-left text-sm font-semibold",
                view === "history"
                  ? "bg-emerald-800 text-white"
                  : "text-zinc-900 hover:bg-zinc-100",
              )}
            >
              Previous days
              <span className="mt-0.5 block text-xs font-normal opacity-90">
                Search by year & month
              </span>
            </button>
          </nav>
          <PreviousDaysPanel
            today={todayMeta}
            selectedDate={selectedDate}
            onSelectDate={openDay}
            active={view === "history"}
          />
        </Drawer>

        <div className="min-w-0 flex-1">
          <DayRecordWorkspace
            reportDate={activeDate}
            isToday={activeDate === todayMeta}
          />
        </div>
      </div>
    </div>
  );
}
