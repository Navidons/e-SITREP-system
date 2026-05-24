import { DashboardShell, ensureRole } from "@/components/layout/DashboardShell";
import { AdminConsole } from "@/components/admin/AdminConsole";

export default async function AdminPage() {
  await ensureRole(["ADMIN"]);
  return (
    <DashboardShell title="Administration">
      <p className="mb-4 text-sm text-zinc-700">
        Manage border stations and user accounts. Roles control which menus each
        user sees after they sign in.
      </p>
      <AdminConsole />
    </DashboardShell>
  );
}
