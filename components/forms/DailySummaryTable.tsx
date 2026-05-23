import { nationalityLabel } from "@/lib/constants/nationalities";

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

function SummarySection({
  title,
  section,
}: {
  title: string;
  section: Section;
}) {
  return (
    <div className="overflow-x-auto">
      <h4 className="mb-2 text-sm font-bold uppercase text-zinc-900">{title}</h4>
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
          {section.rows
            .filter((r) => r.male + r.female > 0)
            .sort((a, b) => a.nationalityCode.localeCompare(b.nationalityCode))
            .map((r) => (
              <tr key={r.nationalityCode} className="border-b border-zinc-200">
                <td className="p-2 text-zinc-900">
                  {nationalityLabel(r.nationalityCode)}
                </td>
                <td className="p-2 tabular-nums">{pad(r.male)}</td>
                <td className="p-2 tabular-nums">{pad(r.female)}</td>
                <td className="p-2 tabular-nums font-medium">
                  {pad(r.male + r.female)}
                </td>
              </tr>
            ))}
          <tr className="bg-emerald-50 font-bold text-zinc-900">
            <td className="p-2">Total</td>
            <td className="p-2 tabular-nums">{pad(section.male)}</td>
            <td className="p-2 tabular-nums">{pad(section.female)}</td>
            <td className="p-2 tabular-nums">{pad(section.total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

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
  return (
    <section className="rounded-lg border border-zinc-300 bg-white p-4 shadow-sm">
      <h3 className="text-base font-bold text-zinc-900">
        {stationName} — {reportDate} SITREP (running totals)
      </h3>
      <div className="mt-4 space-y-6">
        <SummarySection title="Arrivals" section={arrivals} />
        <SummarySection title="Departures" section={departures} />
        {specialCategories.map((s) => {
          const total = s.male + s.female;
          if (total === 0) return null;
          const label =
            s.category === "asylum_seekers"
              ? "Asylum seekers"
              : s.category === "refugees"
                ? "Refugees"
                : s.category;
          return (
            <p key={s.category} className="text-sm font-semibold text-zinc-900">
              {label}: {pad(s.male)} male, {pad(s.female)} female — total{" "}
              {pad(total)}
            </p>
          );
        })}
      </div>
    </section>
  );
}
