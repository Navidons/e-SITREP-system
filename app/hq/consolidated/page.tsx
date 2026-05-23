import { DashboardShell, ensureRole } from "@/components/layout/DashboardShell";
import { ConsolidatedClient } from "@/components/hq/ConsolidatedClient";

export default async function ConsolidatedPage() {
  await ensureRole(["HQ_VERIFIER", "HQ_AUTHORISER", "ADMIN"]);
  return (
    <DashboardShell title="Consolidated daily SITREP">
      <ConsolidatedClient />
    </DashboardShell>
  );
}
