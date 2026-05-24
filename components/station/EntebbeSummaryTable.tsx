"use client";

import { Tabs, TabPanel } from "@/components/ui/tabs";
import { useState } from "react";

type AirSummary = {
  flightArrivals: { flights: number; passengers: number };
  flightDepartures: { flights: number; passengers: number };
  deportees: number;
  returned: number;
  offloaded: number;
  denied: number;
};

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: number;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-zinc-900">
        {value.toLocaleString()}
      </p>
      {sub && <p className="mt-1 text-sm text-zinc-600">{sub}</p>}
    </div>
  );
}

export function EntebbeSummaryTable({
  stationName,
  reportDate,
  air,
  inadmissibleCount,
  incidentCount,
}: {
  stationName: string;
  reportDate: string;
  air: AirSummary;
  inadmissibleCount: number;
  incidentCount: number;
}) {
  const [tab, setTab] = useState<"flights" | "cases" | "other">("flights");
  const grand =
    air.flightArrivals.passengers + air.flightDepartures.passengers;

  const tabs = [
    { id: "flights" as const, label: "Flights" },
    { id: "cases" as const, label: "Deportees & denied" },
    { id: "other" as const, label: "Other" },
  ];

  return (
    <section className="overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-sm">
      <div className="border-b border-zinc-200 px-4 py-3">
        <h3 className="text-base font-bold text-zinc-900">
          {stationName} (Airport) — {reportDate}
        </h3>
        <p className="text-sm font-medium text-zinc-600">
          Passenger movements 2:00 PM to 2:00 PM — running totals
        </p>
      </div>

      <Tabs tabs={tabs} active={tab} onChange={(id) => setTab(id as typeof tab)} />

      <div className={tab !== "flights" ? "hidden" : undefined}>
        <TabPanel>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Arrival flights"
              value={air.flightArrivals.flights}
              sub={`${air.flightArrivals.passengers.toLocaleString()} passengers`}
            />
            <StatCard
              label="Departure flights"
              value={air.flightDepartures.flights}
              sub={`${air.flightDepartures.passengers.toLocaleString()} passengers`}
            />
            <StatCard
              label="Grand total (arr + dep)"
              value={grand}
              sub="All flight passenger counts"
            />
          </div>
        </TabPanel>
      </div>

      <div className={tab !== "cases" ? "hidden" : undefined}>
        <TabPanel>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Deportees" value={air.deportees} />
            <StatCard label="Returned persons" value={air.returned} />
            <StatCard label="Offloaded" value={air.offloaded} />
            <StatCard label="Denied entry" value={air.denied} />
          </div>
        </TabPanel>
      </div>

      <div className={tab !== "other" ? "hidden" : undefined}>
        <TabPanel>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard label="Inadmissible (day)" value={inadmissibleCount} />
            <StatCard label="Occurrences logged" value={incidentCount} />
          </div>
        </TabPanel>
      </div>
    </section>
  );
}
