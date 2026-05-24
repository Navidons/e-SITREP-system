import type { CountryOption } from "@/lib/countries/types";

/** Parse combobox text into an ISO country code when possible */
export function parseCountryInput(
  input: string,
  countries: CountryOption[],
): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const paren = trimmed.match(/\(([A-Za-z]{2,3})\)\s*$/);
  if (paren) return paren[1].toUpperCase();

  if (/^[A-Za-z]{2,3}$/.test(trimmed)) return trimmed.toUpperCase();

  const lower = trimmed.toLowerCase();
  const exact = countries.find((c) => c.name.toLowerCase() === lower);
  if (exact) return exact.code;

  const partial = countries.filter((c) => c.name.toLowerCase().includes(lower));
  if (partial.length === 1) return partial[0].code;

  return null;
}
