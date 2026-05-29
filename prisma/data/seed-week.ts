import {
  DailyEntryType,
  PrismaClient,
  ReportStatus,
  ReportingProfile,
} from "@prisma/client";
import { withDbRetry } from "../seed-db";

export const DEMO_WEEK_START = "2026-05-17";
export const DEMO_WEEK_DAYS = 7;

const MOVEMENT_CODES = ["UG", "KE", "SS", "RW", "BI", "TZ", "ER", "SD", "CD", "ET"];

const DAY_STATUSES: ReportStatus[] = [
  ReportStatus.approved,
  ReportStatus.approved,
  ReportStatus.approved,
  ReportStatus.approved,
  ReportStatus.approved,
  ReportStatus.approved,
  ReportStatus.approved,
];

function parseUtcDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

function addDays(isoDate: string, days: number): string {
  const d = parseUtcDate(isoDate);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function atTime(dayIso: string, hour: number, minute = 0): Date {
  const base = parseUtcDate(dayIso);
  return new Date(base.getTime() + hour * 3_600_000 + minute * 60_000);
}

function pseudo(n: number, salt: number): number {
  return ((n * 17 + salt * 31) % 47) + 3;
}

type Batch = {
  type: DailyEntryType;
  code: string | null;
  male: number;
  female: number;
  hour: number;
  minute?: number;
  flight?: string;
  route?: string;
  shift?: string;
};

function batchesForDay(stationIndex: number, dayIndex: number): Batch[] {
  const s = stationIndex + 1;
  const d = dayIndex + 1;
  const nat = (i: number) =>
    MOVEMENT_CODES[(stationIndex + dayIndex + i) % MOVEMENT_CODES.length];

  return [
    {
      type: DailyEntryType.arrival,
      code: nat(0),
      male: pseudo(s, d),
      female: pseudo(s, d + 1) % 12,
      hour: 8,
    },
    {
      type: DailyEntryType.arrival,
      code: nat(1),
      male: pseudo(s + 2, d + 2),
      female: pseudo(s, d + 3) % 8,
      hour: 10,
      minute: 30,
    },
    {
      type: DailyEntryType.departure,
      code: nat(2),
      male: pseudo(s + 1, d + 4),
      female: pseudo(s + 3, d) % 10,
      hour: 14,
    },
    {
      type: DailyEntryType.departure,
      code: nat(0),
      male: pseudo(s, d + 5),
      female: pseudo(s + 1, d + 6) % 6,
      hour: 16,
    },
    {
      type: DailyEntryType.asylum_seeker,
      code: null,
      male: pseudo(s, d + 7) % 15,
      female: pseudo(s + 2, d + 8) % 12,
      hour: 11,
    },
  ];
}

function airBatchesForDay(stationIndex: number, dayIndex: number): Batch[] {
  const s = stationIndex + 1;
  const d = dayIndex + 1;
  return [
    {
      type: DailyEntryType.flight_arrival,
      code: null,
      male: ((s * 11 + d * 7) % 90) + 40,
      female: 0,
      hour: 9,
      flight: `ET${300 + s}`,
      route: "Addis Ababa",
      shift: "D",
    },
    {
      type: DailyEntryType.flight_departure,
      code: null,
      male: ((s * 13 + d * 5) % 80) + 35,
      female: 0,
      hour: 14,
      flight: `KQ${400 + s}`,
      route: "Nairobi",
      shift: "D",
    },
  ];
}

function entriesCreateData(
  reportDateStr: string,
  batches: Batch[],
  enteredById: number | undefined,
) {
  return batches.map((b) => ({
    entryType: b.type,
    nationalityCode: b.code,
    male: b.male,
    female: b.female,
    flightNumber: b.flight ?? null,
    route: b.route ?? null,
    shift: b.shift ?? null,
    recordedAt: atTime(reportDateStr, b.hour, b.minute ?? 0),
    enteredById: enteredById ?? null,
  }));
}

export async function seedDemoWeekForStations(
  prisma: PrismaClient,
  stations: Array<{ id: number; reportingProfile: ReportingProfile }>,
  inputterByStationId: Map<number, number>,
) {
  const weekEnd = addDays(DEMO_WEEK_START, DEMO_WEEK_DAYS - 1);

  await withDbRetry(prisma, async (db) => {
    await db.dailyEntry.deleteMany({
      where: {
        report: {
          reportDate: {
            gte: parseUtcDate(DEMO_WEEK_START),
            lte: parseUtcDate(weekEnd),
          },
        },
      },
    });

    await db.stationDailyReport.deleteMany({
      where: {
        reportDate: {
          gte: parseUtcDate(DEMO_WEEK_START),
          lte: parseUtcDate(weekEnd),
        },
      },
    });
  });

  console.log(
    `Seeding demo week ${DEMO_WEEK_START} (+${DEMO_WEEK_DAYS - 1} days) for ${stations.length} stations…`,
  );

  for (let si = 0; si < stations.length; si++) {
    const station = stations[si];
    const stationId = station.id;
    const enteredById = inputterByStationId.get(stationId);
    const isAir = station.reportingProfile === ReportingProfile.air;

    await withDbRetry(prisma, async (db) => {
      await db.$transaction(async (tx) => {
        for (let di = 0; di < DEMO_WEEK_DAYS; di++) {
          const reportDateStr = addDays(DEMO_WEEK_START, di);
          const reportDate = parseUtcDate(reportDateStr);
          const status = DAY_STATUSES[di];
          const submitted =
            status !== ReportStatus.draft
              ? { submissionTime: atTime(reportDateStr, 15, 30) }
              : {};

          const batches = isAir
            ? airBatchesForDay(si, di)
            : batchesForDay(si, di);

          await tx.stationDailyReport.create({
            data: {
              stationId,
              reportDate,
              submittedById: enteredById ?? null,
              status,
              staffOnDuty: 8 + (si % 6),
              medicalScreening: isAir
                ? undefined
                : "Routine screening completed.",
              generalRemarks: `Demo week ${reportDateStr} — ${status}.`,
              ...submitted,
              entries: {
                create: entriesCreateData(reportDateStr, batches, enteredById),
              },
            },
          });
        }
      });
    });

    if ((si + 1) % 10 === 0 || si === stations.length - 1) {
      console.log(`  … ${si + 1} / ${stations.length} stations`);
    }
  }
}

export const ELEGU_SAMPLE_DATE = "2026-05-08";

export const ELEGU_SAMPLE_BATCHES: Array<{
  type: DailyEntryType;
  code: string | null;
  male: number;
  female: number;
  h: number;
  m?: number;
  note?: string;
}> = [
  { type: DailyEntryType.arrival, code: "SS", male: 40, female: 20, h: 7, note: "Morning" },
  { type: DailyEntryType.arrival, code: "SS", male: 39, female: 23, h: 9, m: 30 },
  { type: DailyEntryType.arrival, code: "KE", male: 40, female: 2, h: 8 },
  { type: DailyEntryType.arrival, code: "KE", male: 26, female: 2, h: 10, m: 15 },
  { type: DailyEntryType.arrival, code: "ER", male: 16, female: 1, h: 11 },
  { type: DailyEntryType.arrival, code: "UG", male: 10, female: 4, h: 14 },
  { type: DailyEntryType.arrival, code: "BI", male: 1, female: 0, h: 7, m: 30 },
  { type: DailyEntryType.arrival, code: "RW", male: 1, female: 0, h: 12 },
  { type: DailyEntryType.arrival, code: "SD", male: 8, female: 1, h: 13 },
  { type: DailyEntryType.arrival, code: "TZ", male: 1, female: 0, h: 18, m: 30 },
  { type: DailyEntryType.departure, code: "SS", male: 80, female: 36, h: 8 },
  { type: DailyEntryType.departure, code: "KE", male: 26, female: 15, h: 9, m: 30 },
  { type: DailyEntryType.departure, code: "UG", male: 27, female: 17, h: 15, m: 30 },
  { type: DailyEntryType.departure, code: "ER", male: 8, female: 1, h: 12 },
  { type: DailyEntryType.departure, code: "SD", male: 8, female: 0, h: 13, m: 30 },
  { type: DailyEntryType.departure, code: "BI", male: 4, female: 0, h: 17 },
  { type: DailyEntryType.departure, code: "US", male: 1, female: 0, h: 18 },
  { type: DailyEntryType.asylum_seeker, code: null, male: 20, female: 12, h: 10 },
  { type: DailyEntryType.asylum_seeker, code: null, male: 13, female: 10, h: 15 },
];

export async function seedEleguApprovedSample(
  prisma: PrismaClient,
  stationId: number,
  userId: number,
) {
  await withDbRetry(prisma, async (db) => {
    const reportDate = parseUtcDate(ELEGU_SAMPLE_DATE);
    const dayBase = reportDate.getTime();
    const at = (hour: number, min = 0) =>
      new Date(dayBase + hour * 3_600_000 + min * 60_000);

    const report = await db.stationDailyReport.upsert({
      where: {
        stationId_reportDate: { stationId, reportDate },
      },
      update: {
        status: ReportStatus.approved,
        staffOnDuty: 12,
        medicalScreening: "All travellers screened per protocol.",
        generalRemarks: "Normal operations — NCIC sample totals.",
        submissionTime: at(15, 0),
        submittedById: userId,
      },
      create: {
        stationId,
        reportDate,
        submittedById: userId,
        status: ReportStatus.approved,
        staffOnDuty: 12,
        medicalScreening: "All travellers screened per protocol.",
        generalRemarks: "Normal operations — NCIC sample totals.",
        submissionTime: at(15, 0),
      },
    });

    await db.dailyEntry.deleteMany({ where: { reportId: report.id } });

    await db.dailyEntry.createMany({
      data: ELEGU_SAMPLE_BATCHES.map((b) => ({
        reportId: report.id,
        entryType: b.type,
        nationalityCode: b.code,
        male: b.male,
        female: b.female,
        recordedAt: at(b.h, b.m ?? 0),
        enteredById: userId,
        notes: b.note,
      })),
    });
  });
}
