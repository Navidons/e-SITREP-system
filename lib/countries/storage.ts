import type { CountryCodeFormat } from "@/lib/countries/types";
import {
  codeForCountry,
  normalizeCountryCode,
  resolveCountry,
} from "@/lib/countries/service";

/** Canonical format persisted on daily_entries.nationality_code */
export const STORAGE_COUNTRY_CODE_FORMAT: CountryCodeFormat = "alpha2";

/** NCIC consolidated lines sometimes use legacy 3-letter labels (e.g. SSD, USA). */
const CONSOLIDATED_OUTPUT_ALIASES: Record<string, string> = {
  SS: "SSD",
  US: "USA",
};

export function normalizeCountryCodeForStorage(code: string): string {
  return normalizeCountryCode(code, STORAGE_COUNTRY_CODE_FORMAT);
}

export function countryCodeForDisplay(
  stored: string | null | undefined,
  format: CountryCodeFormat,
): string | null {
  if (!stored) return null;
  const country = resolveCountry(stored);
  if (!country) return stored;
  return codeForCountry(country, format);
}

export function countryCodeForConsolidatedOutput(stored: string): string {
  const display = countryCodeForDisplay(stored, STORAGE_COUNTRY_CODE_FORMAT);
  if (!display) return stored;
  return CONSOLIDATED_OUTPUT_ALIASES[display] ?? display;
}
