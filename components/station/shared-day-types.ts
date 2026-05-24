import type { DayEntryTypeId } from "@/types/reports";

export type DailyEntryRow = {
  id: number;
  entryType: DayEntryTypeId;
  nationalityCode: string | null;
  male: number;
  female: number;
  flightNumber: string | null;
  route: string | null;
  shift: string | null;
  passportNo: string | null;
  personName: string | null;
  recordedAt: string;
  notes: string | null;
  enteredBy?: { fullName: string };
};

export type DayIncidentRow = {
  id: number;
  incidentType: string | null;
  description: string;
  passportNo: string | null;
  personName: string | null;
  actionTaken: string | null;
  createdAt: string;
};

export type DayData = {
  id?: number;
  reportDate: string;
  status: string;
  isToday?: boolean;
  staffOnDuty?: number;
  medicalScreening?: string;
  generalRemarks?: string;
  urgentMatters?: string;
  inadmissibleCount?: number;
  staffLeaveNotes?: string;
  entries: DailyEntryRow[];
  incidents?: DayIncidentRow[];
  entryCount?: number;
  summary: {
    arrivals: {
      rows: Array<{ nationalityCode: string; male: number; female: number }>;
      male: number;
      female: number;
      total: number;
    };
    departures: {
      rows: Array<{ nationalityCode: string; male: number; female: number }>;
      male: number;
      female: number;
      total: number;
    };
    specialCategories: Array<{ category: string; male: number; female: number }>;
    air?: {
      flightArrivals: { flights: number; passengers: number };
      flightDepartures: { flights: number; passengers: number };
      deportees: number;
      returned: number;
      offloaded: number;
      denied: number;
    };
  };
  station?: { name: string; reportingProfile?: string };
  amendments?: Array<{
    id: number;
    status: string;
    action: string;
    summary: string;
    reason: string | null;
    reviewComment: string | null;
    targetEntryId: number | null;
    createdAt: string;
    requestedBy?: { fullName: string };
  }>;
  pendingAmendmentCount?: number;
};
