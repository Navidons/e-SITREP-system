import { DashboardShell, ensureRole } from "@/components/layout/DashboardShell";
import { HqDashboardClient } from "@/components/dashboard/HqDashboardClient";

export default async function HqDashboardPage() {
  await ensureRole(["HQ_REVIEWER", "HQ_VERIFIER", "HQ_AUTHORISER", "CLUSTER_SUPERVISOR", "ADMIN"]);
  return (
    <DashboardShell title="HQ Dashboard">
      <HqDashboardClient />
    </DashboardShell>
  );
}
