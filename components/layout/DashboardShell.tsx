import Link from "next/link";
import { auth, signOut } from "@/auth";
import { homePathForRoles } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { AppPreferencesProvider } from "@/components/providers/AppPreferencesProvider";
import { DashboardLayoutClient } from "@/components/layout/DashboardLayoutClient";

const NAV = [
  {
    href: "/station",
    label: "Station entry",
    roles: ["STATION_INPUTTER", "CLUSTER_SUPERVISOR", "ADMIN"],
  },
  {
    href: "/hq/inbox",
    label: "HQ inbox",
    roles: [
      "HQ_REVIEWER",
      "HQ_VERIFIER",
      "HQ_AUTHORISER",
      "CLUSTER_SUPERVISOR",
      "ADMIN",
    ],
  },
  {
    href: "/hq/consolidated",
    label: "Consolidated SITREP",
    roles: ["HQ_VERIFIER", "HQ_AUTHORISER", "ADMIN"],
  },
  {
    href: "/weekly",
    label: "Weekly export",
    roles: ["HQ_VERIFIER", "HQ_AUTHORISER", "ADMIN"],
  },
  { href: "/settings", label: "Settings", roles: ["*"] },
  { href: "/admin", label: "Admin", roles: ["ADMIN"] },
];

export async function DashboardShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { user } = session;
  const links = NAV.filter(
    (item) =>
      item.roles.includes("*") ||
      item.roles.some((r) => user.roles.includes(r)),
  ).map(({ href, label }) => ({ href, label }));

  return (
    <div className="min-h-screen bg-zinc-100">
      <header className="border-b border-emerald-900/20 bg-emerald-900 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div>
            <Link href="/dashboard" className="text-lg font-bold tracking-tight">
              e-SITREP
            </Link>
            <p className="text-xs font-medium text-white/95">
              Ministry of Internal Affairs · NCIC
            </p>
          </div>
          <div className="text-right text-sm text-white">
            <p className="font-semibold">{user.fullName}</p>
            <p className="max-w-[12rem] truncate text-white/95 sm:max-w-none">
              {user.roles.join(", ")}
            </p>
          </div>
        </div>
      </header>

      <AppPreferencesProvider>
        <DashboardLayoutClient
          links={links}
          title={title}
          signOutForm={
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="w-full rounded-md px-3 py-2 text-left font-medium text-red-700 hover:bg-red-50"
              >
                Sign out
              </button>
            </form>
          }
        >
          {children}
        </DashboardLayoutClient>
      </AppPreferencesProvider>
    </div>
  );
}

export async function ensureRole(allowed: string[]) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!allowed.some((r) => session.user.roles.includes(r))) {
    redirect(homePathForRoles(session.user.roles));
  }
  return session.user;
}
