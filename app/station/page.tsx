import { DashboardShell, ensureRole } from "@/components/layout/DashboardShell";
import { StationDayEntry } from "@/components/forms/StationDayEntry";

export default async function StationPage() {
  await ensureRole(["STATION_INPUTTER", "ADMIN"]);
  return (
    <DashboardShell title="Station daily entry">
      <StationDayEntry />
    </DashboardShell>
  );
}
