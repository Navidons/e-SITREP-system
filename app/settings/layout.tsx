import { DashboardShell, ensureRole } from "@/components/layout/DashboardShell";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureRole([
    "STATION_INPUTTER",
    "HQ_REVIEWER",
    "HQ_VERIFIER",
    "HQ_AUTHORISER",
    "ADMIN",
    "CLUSTER_SUPERVISOR",
  ]);
  return <DashboardShell title="Settings">{children}</DashboardShell>;
}
