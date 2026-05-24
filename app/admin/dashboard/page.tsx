import { DashboardShell, ensureRole } from "@/components/layout/DashboardShell";
import { AdminDashboardClient } from "@/components/dashboard/AdminDashboardClient";

export default async function AdminDashboardPage() {
  await ensureRole(["ADMIN"]);
  return (
    <DashboardShell title="Admin Dashboard">
      <AdminDashboardClient />
    </DashboardShell>
  );
}
