/** Maps roles to sidebar menu labels (must match DashboardShell NAV). */
export const ROLE_MENU_ACCESS: Record<string, string[]> = {
  STATION_INPUTTER: ["Settings", "Station entry"],
  CLUSTER_SUPERVISOR: ["Settings", "Station entry", "HQ inbox"],
  HQ_REVIEWER: ["Settings", "HQ inbox"],
  HQ_VERIFIER: ["Settings", "HQ inbox", "Consolidated SITREP", "Weekly export"],
  HQ_AUTHORISER: [
    "Settings",
    "HQ inbox",
    "Consolidated SITREP",
    "Weekly export",
  ],
  ADMIN: [
    "Settings",
    "Station entry",
    "HQ inbox",
    "Consolidated SITREP",
    "Weekly export",
    "Admin",
  ],
};

export function menusForRoles(roleNames: string[]): string[] {
  const set = new Set<string>();
  for (const r of roleNames) {
    for (const m of ROLE_MENU_ACCESS[r] ?? []) set.add(m);
  }
  return [...set].sort();
}

export const ASSIGNABLE_ROLES = [
  {
    name: "STATION_INPUTTER",
    label: "Station inputter",
    description: "Enter daily data at a border post",
    needsStation: true,
  },
  {
    name: "CLUSTER_SUPERVISOR",
    label: "Cluster supervisor",
    description: "Station entry plus HQ review for their cluster",
    needsStation: true,
  },
  {
    name: "HQ_REVIEWER",
    label: "HQ reviewer",
    description: "Review submitted reports",
    needsStation: false,
  },
  {
    name: "HQ_VERIFIER",
    label: "HQ verifier",
    description: "Verify data and run consolidated reports",
    needsStation: false,
  },
  {
    name: "HQ_AUTHORISER",
    label: "HQ authoriser",
    description: "Final approval and exports",
    needsStation: false,
  },
  {
    name: "ADMIN",
    label: "Administrator",
    description: "Full system access including user management",
    needsStation: false,
  },
] as const;

export function roleNeedsStation(roleNames: string[]): boolean {
  return roleNames.some((r) =>
    ASSIGNABLE_ROLES.find((a) => a.name === r && a.needsStation),
  );
}
