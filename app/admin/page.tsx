import { DashboardShell, ensureRole } from "@/components/layout/DashboardShell";

export default async function AdminPage() {
  await ensureRole(["ADMIN"]);
  return (
    <DashboardShell title="Administration">
      <div className="rounded-lg border bg-white p-6 shadow-sm text-sm text-zinc-600">
        <p>
          User and station management UI is planned for Phase 6. Demo data is
          loaded via <code className="text-xs bg-zinc-100 px-1">pnpm db:seed</code>.
        </p>
        <ul className="mt-4 list-disc pl-5 space-y-1">
          <li>5 border stations (ENT, BUS, ELE, MAL, MPO)</li>
          <li>6 roles with permission mapping</li>
          <li>Elegu approved sample report for 2026-05-08</li>
        </ul>
      </div>
    </DashboardShell>
  );
}
