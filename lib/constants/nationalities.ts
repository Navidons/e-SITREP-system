import { countryLabel as resolveCountryLabel } from "@/lib/countries/service";

/** @deprecated Use REST Countries via NationalitySelect / countryLabel */
export const NATIONALITY_CODES: Array<{ code: string; label: string }> = [];

export function nationalityLabel(code: string): string {
  if (!code || code === "—") return "—";
  return resolveCountryLabel(code);
}
