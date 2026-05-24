import { DailyEntryType } from "@prisma/client";

/** Mirrors `ReportingProfile` in Prisma — use this in client UI (not `@prisma/client`). */
export const ReportingProfile = {
  land: "land",
  air: "air",
} as const;

export type ReportingProfile =
  (typeof ReportingProfile)[keyof typeof ReportingProfile];

export type EntryTypeId = DailyEntryType;

const LAND_ENTRY_TYPES: EntryTypeId[] = [
  DailyEntryType.arrival,
  DailyEntryType.departure,
  DailyEntryType.asylum_seeker,
  DailyEntryType.refugee,
];

const AIR_ENTRY_TYPES: EntryTypeId[] = [
  DailyEntryType.flight_arrival,
  DailyEntryType.flight_departure,
  DailyEntryType.deportee,
  DailyEntryType.returned_person,
  DailyEntryType.offloaded,
  DailyEntryType.denied_entry,
];

export const ENTRY_LABELS: Record<EntryTypeId, string> = {
  arrival: "Arrival",
  departure: "Departure",
  asylum_seeker: "Asylum seeker",
  refugee: "Refugee",
  flight_arrival: "Flight arrival",
  flight_departure: "Flight departure",
  deportee: "Deportee",
  returned_person: "Returned person",
  offloaded: "Offloaded passenger",
  denied_entry: "Denied entry",
};

export const AIR_MODULE_GROUPS = [
  {
    id: "flights" as const,
    label: "Flights",
    types: [DailyEntryType.flight_arrival, DailyEntryType.flight_departure],
  },
  {
    id: "deportees" as const,
    label: "Deportees & returned",
    types: [DailyEntryType.deportee, DailyEntryType.returned_person],
  },
  {
    id: "denied" as const,
    label: "Offloaded & denied",
    types: [DailyEntryType.offloaded, DailyEntryType.denied_entry],
  },
];

export function getReportingProfile(
  station?: { reportingProfile?: ReportingProfile | null; type?: string | null } | null,
): ReportingProfile {
  if (station?.reportingProfile) return station.reportingProfile;
  if (station?.type?.toLowerCase() === "air") return ReportingProfile.air;
  return ReportingProfile.land;
}

export function entryTypesForProfile(profile: ReportingProfile): EntryTypeId[] {
  return profile === ReportingProfile.air ? AIR_ENTRY_TYPES : LAND_ENTRY_TYPES;
}

export function isFlightEntryType(type: EntryTypeId): boolean {
  return (
    type === DailyEntryType.flight_arrival ||
    type === DailyEntryType.flight_departure
  );
}

export function isPersonCaseEntryType(type: EntryTypeId): boolean {
  return (
    type === DailyEntryType.deportee ||
    type === DailyEntryType.returned_person ||
    type === DailyEntryType.offloaded ||
    type === DailyEntryType.denied_entry
  );
}

export function entryNeedsNationality(type: EntryTypeId): boolean {
  return (
    type === DailyEntryType.arrival || type === DailyEntryType.departure
  );
}

export function isLandMovementEntry(type: EntryTypeId): boolean {
  return entryNeedsNationality(type);
}

export function entryUsesGenderCounts(type: EntryTypeId): boolean {
  return (
    type === DailyEntryType.arrival ||
    type === DailyEntryType.departure ||
    type === DailyEntryType.asylum_seeker ||
    type === DailyEntryType.refugee
  );
}

export function entryUsesFlightFields(type: EntryTypeId): boolean {
  return isFlightEntryType(type);
}

export function entryUsesPersonFields(type: EntryTypeId): boolean {
  return isPersonCaseEntryType(type);
}
