import { PrismaClient, DailyEntryType, ReportStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ROLE_PERMISSIONS } from "../lib/rbac";

const prisma = new PrismaClient();

const STATIONS = [
  { code: "ENT", name: "ENTEBBE", cluster: "Kampala", type: "Air" },
  { code: "BUS", name: "BUSIA", cluster: "Eastern", type: "Land" },
  { code: "ELE", name: "ELEGU", cluster: "Northern", type: "Land" },
  { code: "MAL", name: "MALABA", cluster: "Eastern", type: "Land" },
  { code: "MPO", name: "MPONDWE", cluster: "Western", type: "Land" },
];

const ROLES = [
  { name: "ADMIN", description: "System Administrator" },
  { name: "HQ_AUTHORISER", description: "HQ Final Approver" },
  { name: "HQ_VERIFIER", description: "HQ Data Verifier" },
  { name: "HQ_REVIEWER", description: "HQ Reviewer" },
  { name: "STATION_INPUTTER", description: "Border Post Data Inputter" },
  { name: "CLUSTER_SUPERVISOR", description: "Cluster Supervisor" },
];

const PERMISSION_LIST = [
  { name: "station.input", description: "Enter station data" },
  { name: "report.review", description: "Review reports" },
  { name: "report.verify", description: "Verify reports" },
  { name: "report.approve", description: "Approve reports" },
  { name: "report.generate.consolidated", description: "Generate consolidated SITREP" },
  { name: "weekly.export", description: "Export weekly Excel" },
  { name: "admin.users", description: "Manage users" },
];

const DEMO_PASSWORD = "Demo@2026";

async function main() {
  console.log("Seeding e-SITREP database...");

  for (const s of STATIONS) {
    await prisma.borderStation.upsert({
      where: { code: s.code },
      update: {},
      create: s,
    });
  }

  for (const p of PERMISSION_LIST) {
    await prisma.permission.upsert({
      where: { name: p.name },
      update: {},
      create: p,
    });
  }

  const permissionMap = new Map(
    (await prisma.permission.findMany()).map((p) => [p.name, p.id]),
  );

  for (const r of ROLES) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: r,
    });

    const perms = ROLE_PERMISSIONS[r.name] ?? [];
    for (const permName of perms) {
      const permissionId = permissionMap.get(permName);
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId },
        },
        update: {},
        create: { roleId: role.id, permissionId },
      });
    }
  }

  const roleMap = new Map(
    (await prisma.role.findMany()).map((r) => [r.name, r.id]),
  );
  const stationMap = new Map(
    (await prisma.borderStation.findMany()).map((s) => [s.code, s.id]),
  );

  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const demoUsers = [
    { username: "admin", fullName: "System Admin", roles: ["ADMIN"], stationCode: null },
    { username: "authoriser", fullName: "HQ Authoriser", roles: ["HQ_AUTHORISER"], stationCode: null },
    { username: "verifier", fullName: "HQ Verifier", roles: ["HQ_VERIFIER"], stationCode: null },
    { username: "reviewer", fullName: "HQ Reviewer", roles: ["HQ_REVIEWER"], stationCode: null },
    { username: "elegu.inputter", fullName: "Elegu Inputter", roles: ["STATION_INPUTTER"], stationCode: "ELE" },
    { username: "busia.inputter", fullName: "Busia Inputter", roles: ["STATION_INPUTTER"], stationCode: "BUS" },
  ];

  for (const u of demoUsers) {
    const user = await prisma.user.upsert({
      where: { username: u.username },
      update: {
        passwordHash: hash,
        fullName: u.fullName,
        stationId: u.stationCode ? stationMap.get(u.stationCode) ?? null : null,
        isActive: true,
      },
      create: {
        username: u.username,
        email: `${u.username}@esitrep.local`,
        passwordHash: hash,
        fullName: u.fullName,
        stationId: u.stationCode ? stationMap.get(u.stationCode) ?? null : null,
      },
    });

    for (const roleName of u.roles) {
      const roleId = roleMap.get(roleName);
      if (!roleId) continue;
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId } },
        update: {},
        create: { userId: user.id, roleId },
      });
    }
  }

  const eleguId = stationMap.get("ELE")!;
  const eleguUser = await prisma.user.findUnique({ where: { username: "elegu.inputter" } });
  const reportDate = new Date("2026-05-08T00:00:00.000Z");

  const eleguReport = await prisma.stationDailyReport.upsert({
    where: {
      stationId_reportDate: { stationId: eleguId, reportDate },
    },
    update: { status: ReportStatus.draft },
    create: {
      stationId: eleguId,
      reportDate,
      submittedById: eleguUser?.id,
      status: ReportStatus.draft,
      staffOnDuty: 12,
      medicalScreening: "All travellers screened per protocol.",
      generalRemarks: "Normal operations.",
    },
  });

  await prisma.dailyEntry.deleteMany({ where: { reportId: eleguReport.id } });

  const dayBase = new Date("2026-05-08T00:00:00.000Z");
  const at = (hour: number, min = 0) =>
    new Date(dayBase.getTime() + hour * 3_600_000 + min * 60_000);

  const batches: Array<{
    type: DailyEntryType;
    code: string | null;
    male: number;
    female: number;
    h: number;
    m?: number;
    note?: string;
  }> = [
    { type: DailyEntryType.arrival, code: "SSD", male: 40, female: 20, h: 7, note: "Morning" },
    { type: DailyEntryType.arrival, code: "SSD", male: 39, female: 23, h: 9, m: 30 },
    { type: DailyEntryType.arrival, code: "KE", male: 40, female: 2, h: 8 },
    { type: DailyEntryType.arrival, code: "KE", male: 26, female: 2, h: 10, m: 15 },
    { type: DailyEntryType.arrival, code: "ER", male: 16, female: 1, h: 11 },
    { type: DailyEntryType.arrival, code: "UG", male: 10, female: 4, h: 14 },
    { type: DailyEntryType.arrival, code: "BI", male: 1, female: 0, h: 7, m: 30 },
    { type: DailyEntryType.arrival, code: "RW", male: 1, female: 0, h: 12 },
    { type: DailyEntryType.arrival, code: "SD", male: 8, female: 1, h: 13 },
    { type: DailyEntryType.arrival, code: "TZ", male: 1, female: 0, h: 18, m: 30 },
    { type: DailyEntryType.departure, code: "SSD", male: 80, female: 36, h: 8 },
    { type: DailyEntryType.departure, code: "KE", male: 26, female: 15, h: 9, m: 30 },
    { type: DailyEntryType.departure, code: "UG", male: 27, female: 17, h: 15, m: 30 },
    { type: DailyEntryType.departure, code: "ER", male: 8, female: 1, h: 12 },
    { type: DailyEntryType.departure, code: "SD", male: 8, female: 0, h: 13, m: 30 },
    { type: DailyEntryType.departure, code: "BI", male: 4, female: 0, h: 17 },
    { type: DailyEntryType.departure, code: "USA", male: 1, female: 0, h: 18 },
    { type: DailyEntryType.asylum_seeker, code: null, male: 20, female: 12, h: 10 },
    { type: DailyEntryType.asylum_seeker, code: null, male: 13, female: 10, h: 15 },
  ];

  for (const b of batches) {
    await prisma.dailyEntry.create({
      data: {
        reportId: eleguReport.id,
        entryType: b.type,
        nationalityCode: b.code,
        male: b.male,
        female: b.female,
        recordedAt: at(b.h, b.m ?? 0),
        enteredById: eleguUser?.id,
        notes: b.note,
      },
    });
  }

  console.log("Seed complete. Demo password:", DEMO_PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
