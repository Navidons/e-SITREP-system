/** Nationality codes used in HQ consolidated SITREP lines */
export const NATIONALITY_CODES = [
  { code: "BI", label: "Burundi" },
  { code: "ER", label: "Eritrea" },
  { code: "KE", label: "Kenya" },
  { code: "RW", label: "Rwanda" },
  { code: "SSD", label: "South Sudan" },
  { code: "SD", label: "Sudan" },
  { code: "UG", label: "Uganda" },
  { code: "TZ", label: "Tanzania" },
  { code: "USA", label: "United States" },
  { code: "CD", label: "DR Congo" },
  { code: "ET", label: "Ethiopia" },
  { code: "SO", label: "Somalia" },
  { code: "GB", label: "United Kingdom" },
  { code: "IN", label: "India" },
  { code: "CN", label: "China" },
] as const;

export type NationalityCode = (typeof NATIONALITY_CODES)[number]["code"];

export function nationalityLabel(code: string): string {
  return NATIONALITY_CODES.find((n) => n.code === code)?.label ?? code;
}
