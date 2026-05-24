import { DashboardShell, ensureRole } from "@/components/layout/DashboardShell";
import { WeeklyExportClient } from "@/components/weekly/WeeklyExportClient";

export default async function WeeklyPage() {
  await ensureRole(["HQ_VERIFIER", "HQ_AUTHORISER", "ADMIN"]);
  return (
    <DashboardShell title="Weekly statistics export">
      <WeeklyExportClient />
    </DashboardShell>
  );
}
