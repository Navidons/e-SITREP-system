import { LEGACY_ALPHA2_ALIASES } from "@/lib/countries/legacy-aliases";
import type {
  Country,
  CountryCodeFormat,
  CountryOption,
} from "@/lib/countries/types";

const REST_COUNTRIES_URL =
  process.env.REST_COUNTRIES_URL ??
  "https://restcountries.com/v3.1/all?fields=name,cca2,cca3";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Border posts see these nationalities most often — pinned at top of lists */
export const PRIORITY_ALPHA2 = [
  "UG",
  "KE",
  "SS",
  "TZ",
  "RW",
  "BI",
  "ER",
  "SD",
  "CD",
  "ET",
  "SO",
] as const;

type RestCountry = {
  name?: { common?: string };
  cca2?: string;
  cca3?: string;
};

let cache: { countries: Country[]; expiresAt: number } | null = null;
let byAlpha2 = new Map<string, Country>();
let byAlpha3 = new Map<string, Country>();

function rebuildIndexes(countries: Country[]) {
  byAlpha2 = new Map(countries.map((c) => [c.alpha2, c]));
  byAlpha3 = new Map(countries.map((c) => [c.alpha3, c]));
}

export async function loadCountries(): Promise<Country[]> {
  if (cache && Date.now() < cache.expiresAt) {
    return cache.countries;
  }

  const res = await fetch(REST_COUNTRIES_URL, {
    headers: { Accept: "application/json" },
    next: { revalidate: 86_400 },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch countries (${res.status})`);
  }

  const data = (await res.json()) as RestCountry[];
  const countries: Country[] = data
    .filter(
      (c) =>
        c.name?.common &&
        c.cca2 &&
        c.cca2.length === 2 &&
        c.cca3 &&
        c.cca3.length === 3,
    )
    .map((c) => ({
      name: c.name!.common!,
      alpha2: c.cca2!.toUpperCase(),
      alpha3: c.cca3!.toUpperCase(),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  rebuildIndexes(countries);
  cache = { countries, expiresAt: Date.now() + CACHE_TTL_MS };
  return countries;
}

export function getCachedCountries(): Country[] {
  return cache?.countries ?? [];
}

/** Load REST Countries index before resolve/normalize (required on server routes). */
export async function ensureCountriesLoaded(): Promise<Country[]> {
  return loadCountries();
}

export function resolveCountry(code: string): Country | undefined {
  const raw = code.trim().toUpperCase();
  if (!raw) return undefined;

  const alias2 = LEGACY_ALPHA2_ALIASES[raw];
  if (alias2) return byAlpha2.get(alias2);

  if (raw.length === 2) return byAlpha2.get(raw);
  if (raw.length === 3) return byAlpha3.get(raw) ?? byAlpha2.get(raw);

  return undefined;
}

export function codeForCountry(
  country: Country,
  format: CountryCodeFormat,
): string {
  return format === "alpha2" ? country.alpha2 : country.alpha3;
}

export function normalizeCountryCode(
  code: string,
  format: CountryCodeFormat,
): string {
  const country = resolveCountry(code);
  if (!country) return code.trim().toUpperCase();
  return codeForCountry(country, format);
}

export function countryLabel(code: string): string {
  return resolveCountry(code)?.name ?? code;
}

export function toCountryOptions(
  countries: Country[],
  format: CountryCodeFormat,
): CountryOption[] {
  return countries.map((c) => ({
    code: codeForCountry(c, format),
    name: c.name,
    alpha2: c.alpha2,
    alpha3: c.alpha3,
  }));
}

export function sortCountryOptions(
  options: CountryOption[],
  format: CountryCodeFormat,
): CountryOption[] {
  const priority = new Set(
    PRIORITY_ALPHA2.map((a2) => {
      const c = byAlpha2.get(a2);
      return c ? codeForCountry(c, format) : a2;
    }),
  );

  const pinned: CountryOption[] = [];
  const rest: CountryOption[] = [];

  for (const o of options) {
    if (priority.has(o.code)) pinned.push(o);
    else rest.push(o);
  }

  pinned.sort((a, b) => a.name.localeCompare(b.name));
  return [...pinned, ...rest];
}

export function defaultCountryCode(format: CountryCodeFormat): string {
  const ug = byAlpha2.get("UG");
  if (ug) return codeForCountry(ug, format);
  return format === "alpha2" ? "UG" : "UGA";
}

/** HQ consolidated SITREP line order (Elegu sample / NCIC convention) */
const CONSOLIDATED_OUTPUT_ORDER = [
  "BI",
  "ER",
  "KE",
  "RW",
  "SSD",
  "SS",
  "SD",
  "UG",
  "TZ",
  "USA",
  "US",
  "CD",
  "ET",
  "SO",
  "GB",
  "IN",
  "CN",
] as const;

/** HQ consolidated line order: NCIC convention first, then alphabetical by name */
export function sortNationalityCodesForOutput(codes: string[]): string[] {
  const orderIndex = new Map<string, number>();
  CONSOLIDATED_OUTPUT_ORDER.forEach((code, i) => {
    orderIndex.set(code, i);
    const c = resolveCountry(code);
    if (c) {
      orderIndex.set(c.alpha2, i);
      orderIndex.set(c.alpha3, i);
    }
  });
  for (const [legacy, a2] of Object.entries(LEGACY_ALPHA2_ALIASES)) {
    const idx = orderIndex.get(a2);
    if (idx !== undefined) orderIndex.set(legacy, idx);
  }

  return [...codes].sort((a, b) => {
    const pa = orderIndex.get(a) ?? 999;
    const pb = orderIndex.get(b) ?? 999;
    if (pa !== pb) return pa - pb;
    const la = countryLabel(a);
    const lb = countryLabel(b);
    return la.localeCompare(lb);
  });
}
