export const PERMISSIONS = {
  STATION_INPUT: "station.input",
  REPORT_REVIEW: "report.review",
  REPORT_VERIFY: "report.verify",
  REPORT_APPROVE: "report.approve",
  REPORT_GENERATE_CONSOLIDATED: "report.generate.consolidated",
  WEEKLY_EXPORT: "weekly.export",
  ADMIN_USERS: "admin.users",
} as const;

export type PermissionName = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_PERMISSIONS: Record<string, PermissionName[]> = {
  ADMIN: Object.values(PERMISSIONS),
  HQ_AUTHORISER: [
    PERMISSIONS.REPORT_APPROVE,
    PERMISSIONS.REPORT_GENERATE_CONSOLIDATED,
    PERMISSIONS.WEEKLY_EXPORT,
    PERMISSIONS.REPORT_REVIEW,
    PERMISSIONS.REPORT_VERIFY,
  ],
  HQ_VERIFIER: [
    PERMISSIONS.REPORT_VERIFY,
    PERMISSIONS.REPORT_GENERATE_CONSOLIDATED,
    PERMISSIONS.WEEKLY_EXPORT,
    PERMISSIONS.REPORT_REVIEW,
  ],
  HQ_REVIEWER: [PERMISSIONS.REPORT_REVIEW],
  STATION_INPUTTER: [PERMISSIONS.STATION_INPUT],
  CLUSTER_SUPERVISOR: [
    PERMISSIONS.REPORT_REVIEW,
    PERMISSIONS.STATION_INPUT,
  ],
};

export type SessionUser = {
  id: string;
  username: string;
  fullName: string;
  stationId: number | null;
  roles: string[];
  permissions: string[];
};

export function can(user: SessionUser, permission: PermissionName): boolean {
  return user.permissions.includes(permission);
}

export function hasRole(user: SessionUser, role: string): boolean {
  return user.roles.includes(role);
}

/** Direct add/update on submitted days (bypass amendment queue). */
export function isSystemAdmin(user: SessionUser): boolean {
  return hasRole(user, "ADMIN") || can(user, PERMISSIONS.ADMIN_USERS);
}

export function isHqUser(user: SessionUser): boolean {
  return user.roles.some((r) => r.startsWith("HQ_") || r === "ADMIN");
}

export function canAccessStation(
  user: SessionUser,
  stationId: number,
): boolean {
  if (isHqUser(user) || hasRole(user, "ADMIN")) return true;
  return user.stationId === stationId;
}

export function homePathForRoles(roles: string[]): string {
  if (roles.includes("ADMIN")) return "/admin";
  if (roles.some((r) => r.startsWith("HQ_"))) return "/hq/inbox";
  return "/station";
}
