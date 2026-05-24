import { DashboardShell, ensureRole } from "@/components/layout/DashboardShell";
import { InboxClient } from "@/components/hq/InboxClient";

export default async function HqInboxPage() {
  await ensureRole([
    "HQ_REVIEWER",
    "HQ_VERIFIER",
    "HQ_AUTHORISER",
    "ADMIN",
    "CLUSTER_SUPERVISOR",
  ]);
  return (
    <DashboardShell title="HQ inbox — pending reports">
      <InboxClient />
    </DashboardShell>
  );
}
