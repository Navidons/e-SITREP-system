import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { roleNeedsStation } from "@/lib/admin/navigation";

export type UserListRow = {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  isActive: boolean;
  stationId: number | null;
  station: { id: number; code: string; name: string } | null;
  roles: string[];
};

export type StationListRow = {
  id: number;
  code: string;
  name: string;
  cluster: string | null;
  type: string | null;
  location: string | null;
  active: boolean;
  userCount: number;
};

export async function listAdminUsers(): Promise<UserListRow[]> {
  const users = await prisma.user.findMany({
    orderBy: { username: "asc" },
    include: {
      station: { select: { id: true, code: true, name: true } },
      userRoles: { include: { role: { select: { name: true } } } },
    },
  });

  return users.map((u) => ({
    id: u.id,
    username: u.username,
    fullName: u.fullName,
    email: u.email,
    isActive: u.isActive,
    stationId: u.stationId,
    station: u.station,
    roles: u.userRoles.map((ur) => ur.role.name),
  }));
}

export async function listAdminStations(): Promise<StationListRow[]> {
  const stations = await prisma.borderStation.findMany({
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { users: true } } },
  });

  return stations.map((s) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    cluster: s.cluster,
    type: s.type,
    location: s.location,
    active: s.active,
    userCount: s._count.users,
  }));
}

export async function listRoleOptions() {
  return prisma.role.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, description: true },
  });
}

export async function listStationOptions() {
  return prisma.borderStation.findMany({
    where: { active: true },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    select: { id: true, code: true, name: true, active: true },
  });
}

async function resolveRoleIds(roleNames: string[]) {
  const roles = await prisma.role.findMany({
    where: { name: { in: roleNames } },
  });
  const found = new Set(roles.map((r) => r.name));
  const missing = roleNames.filter((n) => !found.has(n));
  if (missing.length > 0) {
    return { error: `Unknown roles: ${missing.join(", ")}` as const };
  }
  return { roleIds: roles.map((r) => r.id) };
}

export async function createAdminUser(params: {
  username: string;
  fullName: string;
  email?: string;
  password: string;
  stationId: number | null;
  roleNames: string[];
  assignedById: number;
}) {
  const username = params.username.trim().toLowerCase();
  if (!username || username.length < 3) {
    return { error: "Username must be at least 3 characters", status: 400 as const };
  }
  if (!params.fullName.trim()) {
    return { error: "Full name is required", status: 400 as const };
  }
  if (params.password.length < 8) {
    return { error: "Password must be at least 8 characters", status: 400 as const };
  }
  if (params.roleNames.length === 0) {
    return { error: "Select at least one role", status: 400 as const };
  }

  if (roleNeedsStation(params.roleNames) && !params.stationId) {
    return {
      error: "Station is required for station inputter or cluster supervisor",
      status: 400 as const,
    };
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return { error: "Username already exists", status: 400 as const };
  }

  const rolesResult = await resolveRoleIds(params.roleNames);
  if ("error" in rolesResult) {
    return { error: rolesResult.error, status: 400 as const };
  }

  const passwordHash = await bcrypt.hash(params.password, 10);

  const user = await prisma.user.create({
    data: {
      username,
      fullName: params.fullName.trim(),
      email: params.email?.trim() || null,
      passwordHash,
      stationId: params.stationId,
      userRoles: {
        create: rolesResult.roleIds.map((roleId) => ({
          roleId,
          assignedBy: params.assignedById,
        })),
      },
    },
  });

  return { userId: user.id };
}

export async function updateAdminUser(
  userId: number,
  params: {
    fullName?: string;
    email?: string | null;
    password?: string;
    stationId?: number | null;
    roleNames?: string[];
    isActive?: boolean;
    assignedById: number;
  },
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "User not found", status: 404 as const };

  if (params.roleNames) {
    if (params.roleNames.length === 0) {
      return { error: "Select at least one role", status: 400 as const };
    }
    const needsStation = roleNeedsStation(params.roleNames);
    const stationId =
      params.stationId !== undefined ? params.stationId : user.stationId;
    if (needsStation && !stationId) {
      return {
        error: "Station is required for station inputter or cluster supervisor",
        status: 400 as const,
      };
    }
  }

  if (params.password && params.password.length < 8) {
    return { error: "Password must be at least 8 characters", status: 400 as const };
  }

  const rolesResult = params.roleNames
    ? await resolveRoleIds(params.roleNames)
    : null;
  if (rolesResult && "error" in rolesResult) {
    return { error: rolesResult.error, status: 400 as const };
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        fullName: params.fullName?.trim() ?? undefined,
        email:
          params.email === undefined
            ? undefined
            : params.email?.trim() || null,
        stationId: params.stationId,
        isActive: params.isActive,
        ...(params.password
          ? { passwordHash: await bcrypt.hash(params.password, 10) }
          : {}),
      },
    });

    if (rolesResult && "roleIds" in rolesResult) {
      await tx.userRole.deleteMany({ where: { userId } });
      await tx.userRole.createMany({
        data: rolesResult.roleIds.map((roleId) => ({
          userId,
          roleId,
          assignedBy: params.assignedById,
        })),
      });
    }
  });

  return { ok: true };
}

export async function createAdminStation(params: {
  code: string;
  name: string;
  cluster?: string;
  type?: string;
  location?: string;
}) {
  const code = params.code.trim().toUpperCase();
  const name = params.name.trim().toUpperCase();
  if (!code || code.length > 20) {
    return { error: "Station code is required (max 20 chars)", status: 400 as const };
  }
  if (!name) {
    return { error: "Station name is required", status: 400 as const };
  }

  const existing = await prisma.borderStation.findFirst({
    where: { OR: [{ code }, { name }] },
  });
  if (existing) {
    return { error: "Station code or name already exists", status: 400 as const };
  }

  const station = await prisma.borderStation.create({
    data: {
      code,
      name,
      cluster: params.cluster?.trim() || null,
      type: params.type?.trim() || null,
      location: params.location?.trim() || null,
    },
  });

  return { stationId: station.id };
}

export async function updateAdminStation(
  stationId: number,
  params: {
    name?: string;
    cluster?: string | null;
    type?: string | null;
    location?: string | null;
    active?: boolean;
  },
) {
  const station = await prisma.borderStation.findUnique({
    where: { id: stationId },
  });
  if (!station) return { error: "Station not found", status: 404 as const };

  const name = params.name?.trim().toUpperCase();
  if (name && name !== station.name) {
    const clash = await prisma.borderStation.findFirst({
      where: { name, NOT: { id: stationId } },
    });
    if (clash) {
      return { error: "Station name already in use", status: 400 as const };
    }
  }

  await prisma.borderStation.update({
    where: { id: stationId },
    data: {
      name: name ?? undefined,
      cluster: params.cluster,
      type: params.type,
      location: params.location,
      active: params.active,
    },
  });

  return { ok: true };
}
