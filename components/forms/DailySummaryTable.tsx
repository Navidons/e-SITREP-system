"use client";

import { useState } from "react";
import { useAppPreferences } from "@/components/providers/AppPreferencesProvider";
import { Tabs, TabPanel } from "@/components/ui/tabs";

type Row = {
  nationalityCode: string;
  male: number;
  female: number;
};

type Section = {
  rows: Row[];
  male: number;
  female: number;
  total: number;
};

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function SummaryTable({ section }: { section: Section }) {
  const { countryLabel } = useAppPreferences();
  const rows = section.rows
    .filter((r) => r.male + r.female > 0)
    .sort((a, b) => a.nationalityCode.localeCompare(b.nationalityCode));

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[360px] border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-zinc-300 bg-zinc-100 text-left">
            <th className="p-2 font-semibold text-zinc-900">Nationality</th>
            <th className="p-2 w-16 font-semibold text-zinc-900">Male</th>
            <th className="p-2 w-16 font-semibold text-zinc-900">Female</th>
            <th className="p-2 w-16 font-semibold text-zinc-900">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="p-6 text-center font-medium text-zinc-700">
                No entries for this category yet.
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.nationalityCode} className="border-b border-zinc-200">
              <td className="p-2 text-zinc-900">
                {countryLabel(r.nationalityCode)}
              </td>
              <td className="p-2 tabular-nums text-zinc-900">{pad(r.male)}</td>
              <td className="p-2 tabular-nums text-zinc-900">{pad(r.female)}</td>
              <td className="p-2 tabular-nums font-semibold text-zinc-900">
                {pad(r.male + r.female)}
              </td>
            </tr>
          ))}
          {rows.length > 0 && (
            <tr className="bg-emerald-50 font-bold text-zinc-900">
              <td className="p-2">Total</td>
              <td className="p-2 tabular-nums">{pad(section.male)}</td>
              <td className="p-2 tabular-nums">{pad(section.female)}</td>
              <td className="p-2 tabular-nums">{pad(section.total)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function SpecialTotals({
  specialCategories,
}: {
  specialCategories: Array<{ category: string; male: number; female: number }>;
}) {
  const items = specialCategories.filter((s) => s.male + s.female > 0);

  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm font-medium text-zinc-700">
        No asylum seeker or refugee entries yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((s) => {
        const total = s.male + s.female;
        const label =
          s.category === "asylum_seekers"
            ? "Asylum seekers"
            : s.category === "refugees"
              ? "Refugees"
              : s.category;
        return (
          <div
            key={s.category}
            className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
          >
            <h4 className="text-sm font-bold uppercase text-zinc-900">{label}</h4>
            <dl className="mt-3 grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <dt className="font-medium text-zinc-600">Male</dt>
                <dd className="mt-1 text-xl font-bold tabular-nums text-zinc-900">
                  {pad(s.male)}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-600">Female</dt>
                <dd className="mt-1 text-xl font-bold tabular-nums text-zinc-900">
                  {pad(s.female)}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-600">Total</dt>
                <dd className="mt-1 text-xl font-bold tabular-nums text-emerald-900">
                  {pad(total)}
                </dd>
              </div>
            </dl>
          </div>
        );
      })}
    </div>
  );
}

type TotalsTabId = "arrivals" | "departures" | "special";

export function DailySummaryTable({
  stationName,
  reportDate,
  arrivals,
  departures,
  specialCategories,
}: {
  stationName: string;
  reportDate: string;
  arrivals: Section;
  departures: Section;
  specialCategories: Array<{ category: string; male: number; female: number }>;
}) {
  const specialTotal = specialCategories.reduce(
    (s, c) => s + c.male + c.female,
    0,
  );

  const [totalsTab, setTotalsTab] = useState<TotalsTabId>("arrivals");

  const subTabs = [
    { id: "arrivals" as const, label: "Arrivals", badge: arrivals.total },
    { id: "departures" as const, label: "Departures", badge: departures.total },
    {
      id: "special" as const,
      label: "Asylum & refugees",
      badge: specialTotal > 0 ? specialTotal : undefined,
    },
  ];

  return (
    <section className="overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-sm">
      <div className="border-b border-zinc-200 px-4 py-3">
        <h3 className="text-base font-bold text-zinc-900">
          {stationName} — {reportDate}
        </h3>
        <p className="text-sm font-medium text-zinc-600">Running day totals</p>
      </div>

      <Tabs
        tabs={subTabs}
        active={totalsTab}
        onChange={(id) => setTotalsTab(id as TotalsTabId)}
      />

      {totalsTab === "arrivals" && (
        <TabPanel>
          <p className="mb-3 text-sm text-zinc-700">
            All arrival batches combined for this date.
          </p>
          <SummaryTable section={arrivals} />
        </TabPanel>
      )}

      {totalsTab === "departures" && (
        <TabPanel>
          <p className="mb-3 text-sm text-zinc-700">
            All departure batches combined for this date.
          </p>
          <SummaryTable section={departures} />
        </TabPanel>
      )}

      {totalsTab === "special" && (
        <TabPanel>
          <p className="mb-3 text-sm text-zinc-700">
            Asylum seekers and refugees recorded today.
          </p>
          <SpecialTotals specialCategories={specialCategories} />
        </TabPanel>
      )}
    </section>
  );
}
