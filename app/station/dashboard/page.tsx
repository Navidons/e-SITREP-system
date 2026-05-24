import { DashboardShell, ensureRole } from "@/components/layout/DashboardShell";
import { StationDashboardClient } from "@/components/dashboard/StationDashboardClient";

export default async function StationDashboardPage() {
  await ensureRole(["STATION_INPUTTER", "CLUSTER_SUPERVISOR", "ADMIN"]);
  return (
    <DashboardShell title="Dashboard">
      <StationDashboardClient />
    </DashboardShell>
  );
}
