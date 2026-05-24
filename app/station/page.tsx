import { DashboardShell, ensureRole } from "@/components/layout/DashboardShell";
import { StationInputterApp } from "@/components/station/StationInputterApp";

export default async function StationPage() {
  await ensureRole(["STATION_INPUTTER", "CLUSTER_SUPERVISOR", "ADMIN"]);
  return (
    <DashboardShell title="Station — daily SITREP">
      <StationInputterApp />
    </DashboardShell>
  );
}
