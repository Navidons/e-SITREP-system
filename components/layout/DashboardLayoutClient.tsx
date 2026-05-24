"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  FileText,
  Inbox,
  BarChart2,
  Calendar,
  Settings,
  ShieldAlert,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const iconMap = {
  FileText,
  Inbox,
  BarChart2,
  Calendar,
  Settings,
  ShieldAlert,
  LayoutDashboard,
};

type NavLink = {
  href: string;
  label: string;
  iconName?: keyof typeof iconMap;
};

type Props = {
  links: NavLink[];
  children: React.ReactNode;
  signOutForm: React.ReactNode;
};

export function DashboardLayoutClient({ links, children, signOutForm }: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    /*
     * This row fills all space below the fixed header.
     * overflow-hidden here is critical — it stops this row from growing
     * the page. Each child manages its own scroll.
     */
    <div className="flex h-full flex-1 overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className={cn(
          "relative flex shrink-0 flex-col border-r border-zinc-200 bg-white transition-all duration-200",
          collapsed ? "w-14" : "w-52",
        )}
      >
        {/* Nav links — scrolls independently if many items */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
          <ul className="space-y-0.5 px-1.5">
            {links.map((item) => {
              const active =
                pathname === item.href ||
                (item.href.length > 1 && pathname.startsWith(item.href));
              const Icon = item.iconName ? iconMap[item.iconName] : null;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-2.5 py-2.5 text-sm font-bold transition-all duration-100 active:scale-[0.97]",
                      active
                        ? "bg-emerald-800 text-white shadow-sm"
                        : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900",
                      collapsed && "justify-center px-0",
                    )}
                  >
                    {Icon && (
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          active ? "text-white" : "text-zinc-500",
                        )}
                      />
                    )}
                    {!collapsed && (
                      <span className="truncate leading-tight">{item.label}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer: sign-out, always at bottom */}
        <div className="shrink-0 border-t border-zinc-200 px-1.5 py-2">
          {collapsed ? (
            <div title="Sign out">{signOutForm}</div>
          ) : (
            signOutForm
          )}
        </div>

        {/* Collapse toggle — pinned to the right edge of the sidebar */}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3 top-6 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-zinc-200 bg-white shadow-sm hover:bg-zinc-50 active:scale-95 transition-all"
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5 text-zinc-500" />
          )}
        </button>
      </aside>

      {/* ── Main content pane ───────────────────────────────────────────── */}
      {/*
       * flex-1 + overflow-y-auto = only this pane scrolls, nothing else.
       * The sidebar, header, and window chrome remain completely static.
       */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="mx-auto max-w-5xl p-5">{children}</div>
      </main>
    </div>
  );
}
