export type MovementInput = {
  movementType: "arrival" | "departure";
  nationalityCode: string;
  male: number;
  female: number;
};

export type SpecialCategoryInput = {
  category: string;
  male: number;
  female: number;
  details?: string;
};

export type IncidentInput = {
  incidentType?: string;
  description: string;
  passportNo?: string;
  personName?: string;
  actionTaken?: string;
};

export type DailyReportPayload = {
  reportDate: string;
  staffOnDuty?: number;
  medicalScreening?: string;
  generalRemarks?: string;
  urgentMatters?: string;
  movements?: MovementInput[];
  specialCategories?: SpecialCategoryInput[];
  incidents?: IncidentInput[];
};

export type DayEntryTypeId =
  | "arrival"
  | "departure"
  | "asylum_seeker"
  | "refugee"
  | "flight_arrival"
  | "flight_departure"
  | "deportee"
  | "returned_person"
  | "offloaded"
  | "denied_entry";

export type DayEntryPayload = {
  reportDate: string;
  entryType: DayEntryTypeId;
  nationalityCode?: string;
  male: number;
  female: number;
  flightNumber?: string;
  route?: string;
  shift?: string;
  passportNo?: string;
  personName?: string;
  recordedAt?: string;
  notes?: string;
  correctionReason?: string;
};

export type DayEntryUpdatePayload = {
  reportDate: string;
  entryType?: DayEntryTypeId;
  nationalityCode?: string;
  male: number;
  female: number;
  flightNumber?: string;
  route?: string;
  shift?: string;
  passportNo?: string;
  personName?: string;
  recordedAt?: string;
  notes?: string;
  correctionReason?: string;
};

export type DayRemarksPayload = {
  reportDate: string;
  staffOnDuty?: number;
  medicalScreening?: string;
  generalRemarks?: string;
  urgentMatters?: string;
  inadmissibleCount?: number;
  staffLeaveNotes?: string;
};

export type IncidentPayload = {
  reportDate: string;
  incidentType?: string;
  description: string;
  passportNo?: string;
  personName?: string;
  actionTaken?: string;
};
