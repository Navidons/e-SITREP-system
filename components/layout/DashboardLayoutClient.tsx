"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Drawer, DrawerToggle, useDrawer } from "@/components/layout/Drawer";
import { cn } from "@/lib/utils";

type NavLink = { href: string; label: string };

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
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <DrawerToggle
          label="Menu"
          active={nav.open}
          onClick={() => nav.setOpen(!nav.open)}
        />
        {title && (
          <h1 className="text-2xl font-semibold text-zinc-900">{title}</h1>
        )}
      </div>

      <div className="flex items-start gap-6">
        <Drawer
          id="main-nav"
          title="Menu"
          subtitle="e-SITREP"
          open={nav.open}
          onOpenChange={nav.setOpen}
          widthClass="w-48"
        >
          <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto p-2 text-sm">
            <div className="space-y-1">
              {links.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href));
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
                      "block rounded-md px-3 py-2 font-medium",
                      active
                        ? "bg-emerald-800 text-white"
                        : "text-zinc-900 hover:bg-emerald-50 hover:text-emerald-950",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
            <div className="mt-auto border-t border-zinc-200 pt-2">
              {signOutForm}
            </div>
          </nav>
        </Drawer>

        <main className="min-w-0 flex-1 scroll-mt-4">{children}</main>
      </div>
    </div>
  );
}
