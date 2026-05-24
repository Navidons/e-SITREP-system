import Link from "next/link";
import { auth, signOut } from "@/auth";
import { homePathForRoles } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { AppPreferencesProvider } from "@/components/providers/AppPreferencesProvider";
import { DashboardLayoutClient } from "@/components/layout/DashboardLayoutClient";
import {
  FileText,
  Inbox,
  BarChart2,
  Calendar,
  Settings,
  ShieldAlert,
  LogOut,
  LayoutDashboard,
} from "lucide-react";

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

  const initials = user.fullName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    /*
     * DESKTOP-APP CHROME
     * The outer div fills exactly the viewport (h-dvh) and hides any overflow.
     * Nothing on the page ever causes the browser's scroll bar to appear.
     * Only the sidebar nav list and the main content pane scroll internally.
     */
    <div className="flex h-dvh flex-col overflow-hidden bg-zinc-100">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header className="flex shrink-0 items-center justify-between border-b border-emerald-950/25 bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 px-4 py-0 text-white shadow-md">
        {/* Brand */}
        <div className="flex items-center gap-3 py-2.5">
          <Link
            href="/dashboard"
            className="text-lg font-black tracking-tight text-white transition hover:text-emerald-300"
          >
            e-SITREP
          </Link>
          <div className="h-5 w-px bg-white/20" />
          <p className="hidden text-xs font-bold uppercase tracking-widest text-emerald-400 sm:block">
            Ministry of Internal Affairs · NCIC
          </p>
        </div>

        {/* Title in the middle on larger screens */}
        {title && (
          <p className="hidden truncate px-4 text-sm font-bold tracking-tight text-emerald-200 lg:block">
            {title}
          </p>
        )}

        {/* User chip */}
        <div className="flex items-center gap-2.5 py-2">
          <div className="hidden flex-col items-end sm:flex">
            <span className="text-sm font-bold leading-tight text-white">
              {user.fullName}
            </span>
            <span className="text-xxs font-bold uppercase tracking-widest text-emerald-400">
              {user.roles.join(" · ")}
            </span>
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-600/60 bg-emerald-800 text-xs font-black text-emerald-100 shadow-inner">
            {initials}
          </div>
        </div>
      </header>

      {/* ── Body row (sidebar + content) ────────────────────────────────── */}
      {/* Height-propagation wrapper — AppPreferencesProvider renders no DOM element */}
      <div className="flex flex-1 overflow-hidden">
        <AppPreferencesProvider>
          <DashboardLayoutClient
            links={links}
            signOutForm={
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <button
                  type="submit"
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-bold text-red-700 transition-all hover:bg-red-50 active:scale-[0.98] cursor-pointer"
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
