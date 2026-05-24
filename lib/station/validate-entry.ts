import type { EntryTypeId } from "@/lib/station/entry-config";
import {
  entryNeedsNationality,
  entryUsesFlightFields,
  entryUsesGenderCounts,
  entryUsesPersonFields,
  isFlightEntryType,
} from "@/lib/station/entry-config";

export type EntryInputShape = {
  entryType: EntryTypeId;
  nationalityCode?: string;
  male: number;
  female: number;
  flightNumber?: string;
  route?: string;
  shift?: string;
  passportNo?: string;
  personName?: string;
  notes?: string;
};

export function validateEntryInput(
  input: EntryInputShape,
): { error: string } | { ok: true } {
  const type = input.entryType;

  if (entryUsesFlightFields(type)) {
    if (!input.flightNumber?.trim()) {
      return { error: "Flight number is required" };
    }
    if (!input.route?.trim()) {
      return { error: "Origin or destination is required" };
    }
    const shift = input.shift?.trim().toUpperCase();
    if (shift !== "B" && shift !== "D") {
      return { error: "Shift must be B (night) or D (day)" };
    }
    if (input.male < 1) {
      return { error: "Enter passenger count (at least 1)" };
    }
    return { ok: true };
  }

  if (entryUsesPersonFields(type)) {
    if (!input.notes?.trim() && !input.personName?.trim()) {
      return { error: "Person name or case details are required" };
    }
    if (input.male + input.female < 1) {
      return { error: "Enter at least one person" };
    }
    return { ok: true };
  }

  if (entryNeedsNationality(type) && !input.nationalityCode?.trim()) {
    return { error: "Nationality is required" };
  }

  if (entryUsesGenderCounts(type) && input.male + input.female < 1) {
    return { error: "Enter at least one person" };
  }

  if (isFlightEntryType(type)) {
    return { error: "Invalid entry type" };
  }

  return { ok: true };
}

export function normalizeEntryPayload(input: EntryInputShape) {
  const type = input.entryType;
  if (entryUsesFlightFields(type)) {
    return {
      nationalityCode: null as string | null,
      male: input.male,
      female: 0,
      flightNumber: input.flightNumber!.trim().toUpperCase(),
      route: input.route!.trim(),
      shift: input.shift!.trim().toUpperCase(),
      passportNo: null as string | null,
      personName: null as string | null,
      notes: input.notes?.trim() || null,
    };
  }
  if (entryUsesPersonFields(type)) {
    const count = Math.max(1, input.male + input.female);
    return {
      nationalityCode: input.nationalityCode?.trim().toUpperCase() || null,
      male: count,
      female: 0,
      flightNumber: input.flightNumber?.trim().toUpperCase() || null,
      route: input.route?.trim() || null,
      shift: input.shift?.trim().toUpperCase() || null,
      passportNo: input.passportNo?.trim() || null,
      personName: input.personName?.trim() || null,
      notes: input.notes?.trim() || null,
    };
  }
  return {
    nationalityCode: input.nationalityCode?.trim().toUpperCase(),
    male: input.male,
    female: input.female,
    flightNumber: null as string | null,
    route: null as string | null,
    shift: null as string | null,
    passportNo: null as string | null,
    personName: null as string | null,
    notes: input.notes?.trim() || null,
  };
}
