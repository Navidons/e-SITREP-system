import {
  CountryCodeFormat,
  PrismaClient,
  ReportingProfile,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { ROLE_PERMISSIONS } from "../lib/rbac";
import { loadCountries } from "../lib/countries/service";
import { normalizeCountryCodeForStorage } from "../lib/countries/storage";
import {
  BORDER_STATIONS,
  stationInputterUsername,
} from "./data/border-stations";
import {
  seedEntebbeAirportProfile,
  seedEntebbeMaySample,
} from "./data/entebbe-seed";
import {
  DEMO_WEEK_START,
  seedDemoWeekForStations,
  seedEleguApprovedSample,
} from "./data/seed-week";

const prisma = new PrismaClient();

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

const CLUSTER_SUPERVISORS = [
  { username: "eastern.supervisor", fullName: "Eastern Cluster Supervisor", cluster: "Eastern" },
  { username: "northern.supervisor", fullName: "Northern Cluster Supervisor", cluster: "Northern" },
  { username: "western.supervisor", fullName: "Western Cluster Supervisor", cluster: "Western" },
  {
    username: "southwestern.supervisor",
    fullName: "South-Western Cluster Supervisor",
    cluster: "South-Western",
  },
  { username: "southern.supervisor", fullName: "Southern Cluster Supervisor", cluster: "Southern" },
  { username: "kampala.supervisor", fullName: "Kampala Cluster Supervisor", cluster: "Kampala" },
];

async function normalizeStoredNationalityCodes() {
  await loadCountries();
  const entries = await prisma.dailyEntry.findMany({
    where: { nationalityCode: { not: null } },
    select: { id: true, nationalityCode: true },
  });

  let updated = 0;
  for (const e of entries) {
    if (!e.nationalityCode) continue;
    const normalized = normalizeCountryCodeForStorage(e.nationalityCode);
    if (normalized !== e.nationalityCode) {
      await prisma.dailyEntry.update({
        where: { id: e.id },
        data: { nationalityCode: normalized },
      });
      updated++;
    }
  }
  if (updated > 0) {
    console.log(`Normalized ${updated} nationality codes to ISO alpha-2.`);
  }
}

async function main() {
  console.log("Seeding e-SITREP database...");

  const officialCodes = BORDER_STATIONS.map((s) => s.code);

  for (const s of BORDER_STATIONS) {
    await prisma.borderStation.upsert({
      where: { code: s.code },
      update: {
        name: s.name,
        cluster: s.cluster,
        type: s.type,
        displayOrder: s.displayOrder,
        active: true,
        reportingProfile:
          s.code === "ENT" ? ReportingProfile.air : ReportingProfile.land,
      },
      create: {
        code: s.code,
        name: s.name,
        cluster: s.cluster,
        type: s.type,
        displayOrder: s.displayOrder,
        reportingProfile:
          s.code === "ENT" ? ReportingProfile.air : ReportingProfile.land,
      },
    });
  }

  const deactivated = await prisma.borderStation.updateMany({
    where: { code: { notIn: officialCodes } },
    data: { active: false },
  });
  if (deactivated.count > 0) {
    console.log(`Deactivated ${deactivated.count} stations not in weekly matrix.`);
  }

  await seedEntebbeAirportProfile(prisma);

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
  const inputterRoleId = roleMap.get("STATION_INPUTTER")!;
  const supervisorRoleId = roleMap.get("CLUSTER_SUPERVISOR")!;

  const hqUsers = [
    { username: "admin", fullName: "System Admin", roles: ["ADMIN"], stationCode: null as string | null, format: CountryCodeFormat.alpha2 },
    { username: "authoriser", fullName: "HQ Authoriser", roles: ["HQ_AUTHORISER"], stationCode: null, format: CountryCodeFormat.alpha2 },
    { username: "verifier", fullName: "HQ Verifier", roles: ["HQ_VERIFIER"], stationCode: null, format: CountryCodeFormat.alpha2 },
    { username: "reviewer", fullName: "HQ Reviewer", roles: ["HQ_REVIEWER"], stationCode: null, format: CountryCodeFormat.alpha2 },
  ];

  for (const u of hqUsers) {
    const user = await prisma.user.upsert({
      where: { username: u.username },
      update: {
        passwordHash: hash,
        fullName: u.fullName,
        stationId: null,
        isActive: true,
        countryCodeFormat: u.format,
      },
      create: {
        username: u.username,
        email: `${u.username}@esitrep.local`,
        passwordHash: hash,
        fullName: u.fullName,
        countryCodeFormat: u.format,
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

  for (const sup of CLUSTER_SUPERVISORS) {
    const user = await prisma.user.upsert({
      where: { username: sup.username },
      update: {
        passwordHash: hash,
        fullName: sup.fullName,
        stationId: null,
        isActive: true,
      },
      create: {
        username: sup.username,
        email: `${sup.username}@esitrep.local`,
        passwordHash: hash,
        fullName: sup.fullName,
      },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: supervisorRoleId } },
      update: {},
      create: { userId: user.id, roleId: supervisorRoleId },
    });
  }

  const inputterByStationId = new Map<number, number>();

  for (let i = 0; i < BORDER_STATIONS.length; i++) {
    const station = BORDER_STATIONS[i];
    const stationId = stationMap.get(station.code)!;
    const username = stationInputterUsername(station.name);
    const useAlpha3 = i % 3 === 1;

    const user = await prisma.user.upsert({
      where: { username },
      update: {
        passwordHash: hash,
        fullName: `${station.name} Inputter`,
        stationId,
        isActive: true,
        countryCodeFormat: useAlpha3
          ? CountryCodeFormat.alpha3
          : CountryCodeFormat.alpha2,
      },
      create: {
        username,
        email: `${username}@esitrep.local`,
        passwordHash: hash,
        fullName: `${station.name} Inputter`,
        stationId,
        countryCodeFormat: useAlpha3
          ? CountryCodeFormat.alpha3
          : CountryCodeFormat.alpha2,
      },
    });

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: inputterRoleId } },
      update: {},
      create: { userId: user.id, roleId: inputterRoleId },
    });

    inputterByStationId.set(stationId, user.id);
  }

  const stationsForWeek = await prisma.borderStation.findMany({
    where: { code: { in: BORDER_STATIONS.map((s) => s.code) } },
    select: { id: true, reportingProfile: true },
  });
  await seedDemoWeekForStations(prisma, stationsForWeek, inputterByStationId);

  const eleguId = stationMap.get("ELE")!;
  const eleguUserId = inputterByStationId.get(eleguId)!;
  await seedEleguApprovedSample(prisma, eleguId, eleguUserId);

  const entebbeId = stationMap.get("ENT")!;
  const entebbeUserId = inputterByStationId.get(entebbeId)!;
  await seedEntebbeMaySample(prisma, entebbeId, entebbeUserId);

  await normalizeStoredNationalityCodes();

  console.log(`Stations: ${BORDER_STATIONS.length}`);
  console.log(`Demo week: ${DEMO_WEEK_START} (+6 days), mixed workflow statuses`);
  console.log(`Station logins: <stationname>.inputter (e.g. elegu.inputter, busia.inputter)`);
  console.log("Password:", DEMO_PASSWORD);
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
