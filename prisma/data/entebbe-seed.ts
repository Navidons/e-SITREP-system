import {
  DailyEntryType,
  PrismaClient,
  ReportStatus,
  ReportingProfile,
} from "@prisma/client";

/** Sample from ENTEBBE REPORT 7th–8th MAY 2026 (period ending 8 May). */
export const ENTEBBE_SAMPLE_DATE = "2026-05-08";

export async function seedEntebbeAirportProfile(prisma: PrismaClient) {
  await prisma.borderStation.update({
    where: { code: "ENT" },
    data: { reportingProfile: ReportingProfile.air, type: "Air" },
  });
}

export async function seedEntebbeMaySample(
  prisma: PrismaClient,
  stationId: number,
  userId: number,
) {
  const reportDate = new Date(`${ENTEBBE_SAMPLE_DATE}T00:00:00.000Z`);
  const dayBase = reportDate.getTime();
  const at = (hour: number, min = 0) =>
    new Date(dayBase + hour * 3_600_000 + min * 60_000);

  const report = await prisma.stationDailyReport.upsert({
    where: { stationId_reportDate: { stationId, reportDate } },
    update: {
      status: ReportStatus.submitted,
      staffOnDuty: 24,
      inadmissibleCount: 1,
      staffLeaveNotes:
        "Shift D: Georgina Balisiima, Musani Brenda on annual leave. Shift B: Angom Jane, Musinguzi Justus on leave.",
      generalRemarks:
        "Arrivals total 1,835 · Departures total 2,034 · Grand total 3,869 (per station report).",
      urgentMatters: "NIL",
      submissionTime: at(14, 0),
      submittedById: userId,
    },
    create: {
      stationId,
      reportDate,
      status: ReportStatus.submitted,
      staffOnDuty: 24,
      inadmissibleCount: 1,
      staffLeaveNotes:
        "Shift D: Georgina Balisiima, Musani Brenda on annual leave. Shift B: Angom Jane, Musinguzi Justus on leave.",
      generalRemarks:
        "Arrivals total 1,835 · Departures total 2,034 · Grand total 3,869 (per station report).",
      urgentMatters: "NIL",
      submissionTime: at(14, 0),
      submittedById: userId,
    },
  });

  await prisma.dailyEntry.deleteMany({ where: { reportId: report.id } });
  await prisma.incident.deleteMany({ where: { reportId: report.id } });

  const flights: Array<{
    type: DailyEntryType;
    flight: string;
    route: string;
    pax: number;
    shift: string;
    h: number;
  }> = [
    { type: DailyEntryType.flight_arrival, flight: "ET338", route: "Addis Ababa", pax: 127, shift: "B", h: 3 },
    { type: DailyEntryType.flight_arrival, flight: "XY683", route: "Riyadh", pax: 104, shift: "B", h: 4 },
    { type: DailyEntryType.flight_arrival, flight: "WB422", route: "Kigali", pax: 25, shift: "B", h: 5 },
    { type: DailyEntryType.flight_arrival, flight: "KQ418", route: "Nairobi", pax: 81, shift: "B", h: 8 },
    { type: DailyEntryType.flight_departure, flight: "ET339", route: "Addis Ababa", pax: 80, shift: "B", h: 9 },
    { type: DailyEntryType.flight_departure, flight: "QR1384", route: "Doha", pax: 219, shift: "B", h: 10 },
    { type: DailyEntryType.flight_arrival, flight: "FZ619", route: "Dubai", pax: 125, shift: "D", h: 11 },
    { type: DailyEntryType.flight_arrival, flight: "ET332", route: "Addis Ababa", pax: 145, shift: "D", h: 12 },
    { type: DailyEntryType.flight_departure, flight: "FZ620", route: "Dubai", pax: 130, shift: "D", h: 13 },
    { type: DailyEntryType.flight_departure, flight: "ET333", route: "Addis Ababa", pax: 149, shift: "D", h: 14 },
  ];

  for (const f of flights) {
    await prisma.dailyEntry.create({
      data: {
        reportId: report.id,
        entryType: f.type,
        flightNumber: f.flight,
        route: f.route,
        shift: f.shift,
        male: f.pax,
        female: 0,
        recordedAt: at(f.h),
        enteredById: userId,
      },
    });
  }

  await prisma.dailyEntry.create({
    data: {
      reportId: report.id,
      entryType: DailyEntryType.deportee,
      personName: "Mujuri Waswa",
      passportNo: "B00582985",
      nationalityCode: "UG",
      male: 1,
      female: 0,
      notes: "Deported from Abu Dhabi due to lost passport.",
      recordedAt: at(15),
      enteredById: userId,
    },
  });

  await prisma.dailyEntry.create({
    data: {
      reportId: report.id,
      entryType: DailyEntryType.deportee,
      personName: "Muluya Douglas",
      passportNo: "A00959786",
      nationalityCode: "UG",
      male: 1,
      female: 0,
      notes: "Deported from Dubai due to overstay.",
      recordedAt: at(15, 30),
      enteredById: userId,
    },
  });

  await prisma.dailyEntry.create({
    data: {
      reportId: report.id,
      entryType: DailyEntryType.offloaded,
      personName: "Brimana Amissi",
      passportNo: "OP0378532",
      nationalityCode: "BI",
      male: 1,
      flightNumber: "FZ6521",
      notes:
        "Non-resident traveling to UAE for tourism; no funds; offloaded and advised to originate from home country.",
      recordedAt: at(16),
      enteredById: userId,
    },
  });

  await prisma.incident.create({
    data: {
      reportId: report.id,
      incidentType: "occurrence_day",
      personName: "Jackson Kelvin Amazing",
      passportNo: "PP0288050",
      description:
        "Liberian national entered via Katuna 6/5/26, proceeded to Dubai, denied entry, returned to Uganda; advised ticket to Rwanda.",
    },
  });

  await prisma.incident.create({
    data: {
      reportId: report.id,
      incidentType: "occurrence_night",
      description: "NIL",
    },
  });
}
