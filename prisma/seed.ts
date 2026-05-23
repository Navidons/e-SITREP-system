import { PrismaClient, MovementType, ReportStatus } from "@prisma/client";
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

const ELEGU_ARRIVALS = [
  ["BI", 1, 0],
  ["ER", 16, 1],
  ["KE", 66, 4],
  ["RW", 1, 0],
  ["SSD", 79, 43],
  ["SD", 8, 1],
  ["UG", 10, 4],
  ["TZ", 1, 0],
] as const;

const ELEGU_DEPARTURES = [
  ["BI", 4, 0],
  ["ER", 8, 1],
  ["KE", 26, 15],
  ["SSD", 80, 36],
  ["SD", 8, 0],
  ["UG", 27, 17],
  ["USA", 1, 0],
] as const;

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

  await prisma.movement.deleteMany({ where: { reportId: eleguReport.id } });
  await prisma.specialCategory.deleteMany({ where: { reportId: eleguReport.id } });

  const dayBase = new Date("2026-05-08T00:00:00.000Z");
  const at = (hour: number, min = 0) =>
    new Date(dayBase.getTime() + hour * 3_600_000 + min * 60_000);

  // Simulated batches through the day (sums match ELEGU 08.05.2026 SITREP)
  const arrivalBatches: Array<[string, number, number, number, number, string?]> = [
    ["SSD", 40, 20, 7, 0, "Morning Sudan block"],
    ["SSD", 39, 23, 9, 30, "Midday South Sudan"],
    ["KE", 40, 2, 8, 0],
    ["KE", 26, 2, 10, 15],
    ["ER", 10, 1, 11, 0],
    ["ER", 6, 0, 14, 30],
    ["UG", 6, 2, 15, 0],
    ["UG", 4, 2, 16, 45],
    ["BI", 1, 0, 7, 30],
    ["RW", 1, 0, 12, 0],
    ["SD", 5, 1, 13, 0],
    ["SD", 3, 0, 17, 0],
    ["TZ", 1, 0, 18, 30],
  ];

  for (const [code, male, female, h, m, note] of arrivalBatches) {
    await prisma.movement.create({
      data: {
        reportId: eleguReport.id,
        movementType: MovementType.arrival,
        nationalityCode: code,
        male,
        female,
        recordedAt: at(h, m),
        enteredById: eleguUser?.id,
        notes: note,
      },
    });
  }

  const departureBatches: Array<[string, number, number, number, number]> = [
    ["SSD", 45, 18, 8, 0],
    ["SSD", 35, 18, 11, 0],
    ["KE", 15, 8, 9, 30],
    ["KE", 11, 7, 14, 0],
    ["UG", 14, 9, 10, 0],
    ["UG", 13, 8, 15, 30],
    ["ER", 5, 1, 12, 0],
    ["ER", 3, 0, 16, 0],
    ["SD", 8, 0, 13, 30],
    ["BI", 4, 0, 17, 0],
    ["USA", 1, 0, 18, 0],
  ];

  for (const [code, male, female, h, m] of departureBatches) {
    await prisma.movement.create({
      data: {
        reportId: eleguReport.id,
        movementType: MovementType.departure,
        nationalityCode: code,
        male,
        female,
        recordedAt: at(h, m),
        enteredById: eleguUser?.id,
      },
    });
  }

  await prisma.specialCategory.create({
    data: {
      reportId: eleguReport.id,
      category: "asylum_seekers",
      male: 20,
      female: 12,
      recordedAt: at(10, 0),
      enteredById: eleguUser?.id,
      notes: "Morning intake",
    },
  });
  await prisma.specialCategory.create({
    data: {
      reportId: eleguReport.id,
      category: "asylum_seekers",
      male: 13,
      female: 10,
      recordedAt: at(15, 0),
      enteredById: eleguUser?.id,
      notes: "Afternoon intake",
    },
  });

  console.log("Seed complete. Demo password for all users:", DEMO_PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
