import { DashboardShell, ensureRole } from "@/components/layout/DashboardShell";
import { StationInputterApp } from "@/components/station/StationInputterApp";

export default async function StationPage() {
  const user = await ensureRole([
    "STATION_INPUTTER",
    "CLUSTER_SUPERVISOR",
    "ADMIN",
  ]);
  const isAdmin =
    user.roles.includes("ADMIN") ||
    user.permissions.includes("admin.users");
  return (
    <DashboardShell title="Station — daily SITREP">
      <StationInputterApp isAdmin={isAdmin} />
    </DashboardShell>
  );
}
