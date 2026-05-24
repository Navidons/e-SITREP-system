"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Drawer, DrawerToggle, useDrawer } from "@/components/layout/Drawer";
import { cn } from "@/lib/utils";
import { FileText, Inbox, BarChart2, Calendar, Settings, ShieldAlert, LayoutDashboard } from "lucide-react";

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
  title?: string;
  children: React.ReactNode;
  signOutForm: React.ReactNode;
};

export function DashboardLayoutClient({
  links,
  title,
  children,
  signOutForm,
}: Props) {
  const pathname = usePathname();
  const nav = useDrawer("main-nav", true);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <DrawerToggle
          label="Menu"
          active={nav.open}
          onClick={() => nav.setOpen(!nav.open)}
        />
        {title && (
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">{title}</h1>
        )}
      </div>

      <div className="flex items-start gap-6">
        <Drawer
          id="main-nav"
          title="Menu"
          subtitle="e-SITREP Navigation"
          open={nav.open}
          onOpenChange={nav.setOpen}
          widthClass="w-56"
        >
          <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto p-2 text-sm">
            <div className="space-y-1">
              {links.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href));
                
                const IconComponent = item.iconName ? iconMap[item.iconName] : null;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => {
                      if (window.matchMedia("(max-width: 1023px)").matches) {
                        nav.setOpen(false);
                      }
                    }}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3.5 py-2.5 font-bold tracking-tight transition-all duration-150 active:scale-[0.98]",
                      active
                        ? "bg-emerald-800 text-white shadow-md shadow-emerald-800/10"
                        : "text-zinc-700 hover:bg-emerald-50/60 hover:text-emerald-950",
                    )}
                  >
                    {IconComponent && <IconComponent className="h-4 w-4 shrink-0" />}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
            <div className="mt-auto border-t border-zinc-200 pt-2">
              {signOutForm}
            </div>
          </nav>
        </Drawer>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
