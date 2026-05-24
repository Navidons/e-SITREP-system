"use client";

import { cn } from "@/lib/utils";

export type TabItem = {
  id: string;
  label: string;
  badge?: number;
};

export function Tabs({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-1 overflow-x-auto border-b border-zinc-250 bg-white px-2 py-0.5",
        className,
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              "shrink-0 border-b-2 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-emerald-800/40 relative cursor-pointer",
              isActive
                ? "border-emerald-800 text-emerald-950 bg-emerald-50/40"
                : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-800",
            )}
          >
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 ? (
              <span
                className={cn(
                  "ml-2 rounded-full px-2 py-0.5 text-xxs font-extrabold shadow-sm transition",
                  isActive ? "bg-emerald-800 text-white" : "bg-zinc-100 text-zinc-700",
                )}
              >
                {tab.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-b-xl border border-t-0 border-zinc-200 bg-white p-5 shadow-sm transition-all duration-200",
        className,
      )}
    >
      {children}
    </div>
  );
}
