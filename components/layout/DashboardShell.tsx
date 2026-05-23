import Link from "next/link";
import { auth, signOut } from "@/auth";
import { homePathForRoles } from "@/lib/rbac";
import { redirect } from "next/navigation";

const NAV = [
  { href: "/station", label: "Station entry", roles: ["STATION_INPUTTER"] },
  { href: "/hq/inbox", label: "HQ inbox", roles: ["HQ_REVIEWER", "HQ_VERIFIER", "HQ_AUTHORISER", "ADMIN"] },
  { href: "/hq/consolidated", label: "Consolidated SITREP", roles: ["HQ_VERIFIER", "HQ_AUTHORISER", "ADMIN"] },
  { href: "/weekly", label: "Weekly export", roles: ["HQ_VERIFIER", "HQ_AUTHORISER", "ADMIN"] },
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
  const links = NAV.filter((item) =>
    item.roles.some((r) => user.roles.includes(r)),
  );

  return (
    <div className="min-h-screen bg-zinc-100">
      <header className="border-b border-emerald-900/20 bg-emerald-900 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div>
            <Link href="/dashboard" className="text-lg font-bold tracking-tight">
              e-SITREP
            </Link>
            <p className="text-xs font-medium text-white">
              Ministry of Internal Affairs · NCIC
            </p>
          </div>
          <div className="text-right text-sm text-white">
            <p className="font-semibold">{user.fullName}</p>
            <p className="text-white/95">{user.roles.join(", ")}</p>
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6">
        <aside className="w-48 shrink-0">
          <nav className="space-y-1 rounded-lg border bg-white p-2 text-sm shadow-sm">
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded px-3 py-2 font-medium text-zinc-900 hover:bg-emerald-50 hover:text-emerald-950"
              >
                {item.label}
              </Link>
            ))}
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="mt-2 w-full rounded px-3 py-2 text-left text-red-700 hover:bg-red-50"
              >
                Sign out
              </button>
            </form>
          </nav>
        </aside>
        <main className="min-w-0 flex-1">
          {title && (
            <h1 className="mb-4 text-2xl font-semibold text-zinc-900">{title}</h1>
          )}
          {children}
        </main>
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
