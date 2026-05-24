import Link from "next/link";
import { auth, signOut } from "@/auth";
import { homePathForRoles } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { AppPreferencesProvider } from "@/components/providers/AppPreferencesProvider";
import { DashboardLayoutClient } from "@/components/layout/DashboardLayoutClient";
import { FileText, Inbox, BarChart2, Calendar, Settings, ShieldAlert, LogOut, LayoutDashboard } from "lucide-react";

const NAV = [
  {
    href: "/station/dashboard",
    label: "Dashboard",
    roles: ["STATION_INPUTTER", "CLUSTER_SUPERVISOR"],
    iconName: "LayoutDashboard" as const,
  },
  {
    href: "/hq/dashboard",
    label: "Dashboard",
    roles: ["HQ_REVIEWER", "HQ_VERIFIER", "HQ_AUTHORISER"],
    iconName: "LayoutDashboard" as const,
  },
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    roles: ["ADMIN"],
    iconName: "LayoutDashboard" as const,
  },
  {
    href: "/station",
    label: "Station entry",
    roles: ["STATION_INPUTTER", "CLUSTER_SUPERVISOR", "ADMIN"],
    iconName: "FileText" as const,
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
    iconName: "Inbox" as const,
  },
  {
    href: "/hq/consolidated",
    label: "Consolidated SITREP",
    roles: ["HQ_VERIFIER", "HQ_AUTHORISER", "ADMIN"],
    iconName: "BarChart2" as const,
  },
  {
    href: "/weekly",
    label: "Weekly export",
    roles: ["HQ_VERIFIER", "HQ_AUTHORISER", "ADMIN"],
    iconName: "Calendar" as const,
  },
  { 
    href: "/settings", 
    label: "Settings", 
    roles: ["*"],
    iconName: "Settings" as const,
  },
  { 
    href: "/admin", 
    label: "Admin panel", 
    roles: ["ADMIN"],
    iconName: "ShieldAlert" as const,
  },
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
  ).map(({ href, label, iconName }) => ({ href, label, iconName }));

  return (
    <div className="min-h-screen bg-zinc-100/60">
      <header className="sticky top-0 z-40 border-b border-emerald-950/20 bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-white shadow-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link 
              href="/dashboard" 
              className="text-xl font-black tracking-tight text-white hover:text-emerald-300 transition duration-150"
            >
              e-SITREP
            </Link>
            <div className="hidden h-6 w-px bg-white/20 sm:block" />
            <p className="hidden text-xs font-bold uppercase tracking-wider text-emerald-400 sm:block">
              Ministry of Internal Affairs · NCIC
            </p>
          </div>
          
          <div className="flex items-center gap-3.5 text-right text-sm">
            <div className="hidden flex-col sm:flex">
              <span className="font-bold tracking-tight text-white">{user.fullName}</span>
              <span className="text-xxs font-bold uppercase tracking-wider text-emerald-300">
                {user.roles.join(" · ")}
              </span>
            </div>
            {/* Minimal Mobile User Indicator */}
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-800 border border-emerald-700/50 text-emerald-100 font-extrabold text-sm uppercase shadow-inner sm:hidden">
              {user.fullName.split(" ").map(n => n[0]).slice(0, 2).join("")}
            </div>
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
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left font-bold text-sm text-red-700 hover:bg-red-50 active:scale-[0.98] transition-all cursor-pointer"
              >
                <LogOut className="h-4 w-4 shrink-0" />
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
