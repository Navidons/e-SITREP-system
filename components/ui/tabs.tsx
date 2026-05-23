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
        "flex gap-1 overflow-x-auto border-b border-zinc-300 bg-white px-1",
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
              "shrink-0 border-b-2 px-4 py-3 text-sm font-semibold transition-colors",
              isActive
                ? "border-emerald-800 text-emerald-900"
                : "border-transparent text-zinc-600 hover:border-zinc-300 hover:text-zinc-900",
            )}
          >
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 ? (
              <span
                className={cn(
                  "ml-2 rounded-full px-2 py-0.5 text-xs",
                  isActive ? "bg-emerald-800 text-white" : "bg-zinc-200 text-zinc-800",
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
    <div className={cn("rounded-b-lg border border-t-0 border-zinc-300 bg-white p-4 shadow-sm", className)}>
      {children}
    </div>
  );
}
