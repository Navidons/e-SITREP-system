import { sortNationalityCodesForOutput } from "@/lib/countries/service";

function sortNationalityCodes(codes: string[]): string[] {
  return sortNationalityCodesForOutput(codes);
}

export type MovementRow = {
  movementType: "arrival" | "departure";
  nationalityCode: string;
  male: number;
  female: number;
};

export type SpecialCategoryRow = {
  category: string;
  male: number;
  female: number;
};

export type StationConsolidatedInput = {
  stationCode: string;
  stationName: string;
  movements: MovementRow[];
  specialCategories?: SpecialCategoryRow[];
};

function padCount(n: number): string {
  return n.toString().padStart(2, "0");
}

function formatNationalitySegment(
  total: number,
  code: string,
  female: number,
): string {
  const base = `${padCount(total)} ${code}`;
  return female > 0 ? `${base} (${padCount(female)} FE)` : base;
}

function formatMovementLine(
  movements: MovementRow[],
  movementType: "arrival" | "departure",
  label: string,
): string {
  const filtered = movements.filter((m) => m.movementType === movementType);
  const grouped = new Map<string, { male: number; female: number }>();

  for (const m of filtered) {
    const existing = grouped.get(m.nationalityCode) ?? { male: 0, female: 0 };
    grouped.set(m.nationalityCode, {
      male: existing.male + m.male,
      female: existing.female + m.female,
    });
  }

  const codes = sortNationalityCodes([...grouped.keys()]);
  const segments = codes
    .map((code) => {
      const { male, female } = grouped.get(code)!;
      return { code, total: male + female, female };
    })
    .filter((s) => s.total > 0)
    .map((s) => formatNationalitySegment(s.total, s.code, s.female));

  const grandTotal = [...grouped.values()].reduce(
    (sum, { male, female }) => sum + male + female,
    0,
  );

  if (grandTotal === 0) return `0 ${label}:`;
  return `${grandTotal} ${label}: ${segments.join(", ")}`;
}

function formatAsylumLine(categories: SpecialCategoryRow[]): string | null {
  const asylum = categories.filter((c) =>
    c.category.toLowerCase().includes("asylum"),
  );
  if (asylum.length === 0) return null;

  const total = asylum.reduce((s, c) => s + c.male + c.female, 0);
  if (total === 0) return null;
  return `${total} ASYLUM SEEKERS`;
}

/** Format one station block like HQ manual extract (Elegu sample). */
export function formatStationConsolidated(input: StationConsolidatedInput): string {
  const arrivals = formatMovementLine(
    input.movements,
    "arrival",
    "ARRIVALS",
  );
  const departures = formatMovementLine(
    input.movements,
    "departure",
    "DEPARTURES",
  );
  const asylum = input.specialCategories
    ? formatAsylumLine(input.specialCategories)
    : null;

  const header = `${input.stationName} (${input.stationCode})`;
  const lines = [header, arrivals, departures];
  if (asylum) lines.push(asylum);
  return lines.join("\n");
}

/** Validate formatter against Elegu sample from instructions/support-files/strep system.txt */
export async function formatEleguSampleCheck(): Promise<{
  arrivals: string;
  departures: string;
  asylum: string;
}> {
  const { loadCountries } = await import("@/lib/countries/service");
  await loadCountries();

  const eleguMovements: MovementRow[] = [
    { movementType: "arrival", nationalityCode: "BI", male: 1, female: 0 },
    { movementType: "arrival", nationalityCode: "ER", male: 16, female: 1 },
    { movementType: "arrival", nationalityCode: "KE", male: 66, female: 4 },
    { movementType: "arrival", nationalityCode: "RW", male: 1, female: 0 },
    { movementType: "arrival", nationalityCode: "SSD", male: 79, female: 43 },
    { movementType: "arrival", nationalityCode: "SD", male: 8, female: 1 },
    { movementType: "arrival", nationalityCode: "UG", male: 10, female: 4 },
    { movementType: "arrival", nationalityCode: "TZ", male: 1, female: 0 },
    { movementType: "departure", nationalityCode: "BI", male: 4, female: 0 },
    { movementType: "departure", nationalityCode: "ER", male: 8, female: 1 },
    { movementType: "departure", nationalityCode: "KE", male: 26, female: 15 },
    { movementType: "departure", nationalityCode: "SSD", male: 80, female: 36 },
    { movementType: "departure", nationalityCode: "SD", male: 8, female: 0 },
    { movementType: "departure", nationalityCode: "UG", male: 27, female: 17 },
    { movementType: "departure", nationalityCode: "USA", male: 1, female: 0 },
  ];

  const text = formatStationConsolidated({
    stationCode: "ELE",
    stationName: "ELEGU",
    movements: eleguMovements,
    specialCategories: [
      { category: "asylum_seekers", male: 33, female: 22 },
    ],
  });

  const [, arrivals, departures, asylum] = text.split("\n");
  return { arrivals, departures, asylum };
}
