import { PrismaClient, CountryCodeFormat } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database wipe...");

  try {
    // 1. Delete all dynamic operational data
    console.log("Clearing Daily Entries...");
    await prisma.dailyEntry.deleteMany({});

    console.log("Clearing Incidents...");
    await prisma.incident.deleteMany({});

    console.log("Clearing Day Amendments...");
    await prisma.dayAmendment.deleteMany({});

    console.log("Clearing Station Daily Reports...");
    await prisma.stationDailyReport.deleteMany({});

    console.log("Clearing Audit Logs...");
    await prisma.auditLog.deleteMany({});

    // 2. Clear user assignments (except admin)
    console.log("Fetching non-admin users...");
    const nonAdminUsers = await prisma.user.findMany({
      where: {
        username: { not: "admin" },
      },
      select: { id: true },
    });
    const nonAdminIds = nonAdminUsers.map((u) => u.id);

    console.log("Deleting non-admin user roles...");
    await prisma.userRole.deleteMany({
      where: {
        userId: { in: nonAdminIds },
      },
    });

    console.log("Deleting non-admin users...");
    await prisma.user.deleteMany({
      where: {
        username: { not: "admin" },
      },
    });

    // 3. Ensure the ADMIN role exists and find its ID
    console.log("Ensuring ADMIN role exists...");
    const adminRole = await prisma.role.upsert({
      where: { name: "ADMIN" },
      update: {},
      create: {
        name: "ADMIN",
        description: "System Administrator",
      },
    });

    // 4. Ensure the admin user exists, is active, and is the only user left
    console.log("Ensuring demo admin user exists and is active...");
    const hash = await bcrypt.hash("Demo@2026", 10);
    const adminUser = await prisma.user.upsert({
      where: { username: "admin" },
      update: {
        fullName: "System Admin",
        email: "admin@esitrep.local",
        passwordHash: hash,
        stationId: null,
        isActive: true,
        countryCodeFormat: CountryCodeFormat.alpha2,
      },
      create: {
        username: "admin",
        fullName: "System Admin",
        email: "admin@esitrep.local",
        passwordHash: hash,
        isActive: true,
        countryCodeFormat: CountryCodeFormat.alpha2,
      },
    });

    console.log("Assigning ADMIN role to demo admin user...");
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: adminUser.id,
          roleId: adminRole.id,
        },
      },
      update: {},
      create: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    });

    console.log("Database wipe completed successfully!");
    console.log("Only 'admin' user remains with username: admin / password: Demo@2026");
  } catch (error) {
    console.error("Error during database wipe:", error);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
