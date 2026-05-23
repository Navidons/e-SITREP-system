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

export type DayEntryPayload = {
  reportDate: string;
  entryType: "arrival" | "departure" | "asylum_seeker" | "refugee";
  nationalityCode?: string;
  male: number;
  female: number;
  recordedAt?: string;
  notes?: string;
};
