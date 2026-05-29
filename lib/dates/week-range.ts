import { formatDateInput } from "@/lib/utils";

/** Inclusive calendar days in a standard NCIC reporting week. */
export const WEEK_DAY_COUNT = 7;

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return formatDateInput(d);
}

export function countInclusiveDays(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00.000Z`).getTime();
  const b = new Date(`${to}T00:00:00.000Z`).getTime();
  if (b < a) return 0;
  return Math.floor((b - a) / 86_400_000) + 1;
}

/** End date for a 7-day week starting at `from` (inclusive). */
export function weekEndFromStart(from: string): string {
  return addDaysIso(from, WEEK_DAY_COUNT - 1);
}

/** Start date for a 7-day week ending at `to` (inclusive). */
export function weekStartFromEnd(to: string): string {
  return addDaysIso(to, -(WEEK_DAY_COUNT - 1));
}

export function isValidWeekRange(from: string, to: string): boolean {
  return countInclusiveDays(from, to) === WEEK_DAY_COUNT;
}
