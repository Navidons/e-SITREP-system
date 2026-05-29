"use client";

import {
  Children,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useMemo,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export type TabItem = {
  id: string;
  label: string;
  badge?: number;
};

type TabGroupContextValue = {
  active: string;
  onChange: (id: string) => void;
};

const TabGroupContext = createContext<TabGroupContextValue | null>(null);

/** Preserve window scroll position when switching tabs (avoids page jump). */
export function useStableTabChange<T extends string>(
  onChange: (id: T) => void,
): (id: string) => void {
  return useCallback(
    (id: string) => {
      const scrollY = window.scrollY;
      onChange(id as T);
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollY, left: 0, behavior: "instant" });
      });
    },
    [onChange],
  );
}

export function Tabs({
  tabs,
  active,
  onChange,
  className,
  sticky = true,
}: {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
  /** Keep tab bar visible while scrolling long panels */
  sticky?: boolean;
}) {
  const stableChange = useStableTabChange(onChange);

  return (
    <div
      className={cn(
        "flex gap-1 overflow-x-auto border-b border-zinc-300 bg-white px-1",
        sticky && "sticky top-0 z-20 shadow-sm",
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
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => stableChange(tab.id)}
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
                  isActive
                    ? "bg-emerald-800 text-white"
                    : "bg-zinc-200 text-zinc-800",
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

/** Legacy panel wrapper (single visible panel). Prefer TabGroup for stable layout. */
export function TabPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-b-lg border border-t-0 border-zinc-300 bg-white p-4 shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

type TabGroupPanelProps = {
  id: string;
  children: ReactNode;
  className?: string;
};

function TabGroupPanel({ id, children, className }: TabGroupPanelProps) {
  const ctx = useContext(TabGroupContext);
  if (!ctx) {
    throw new Error("TabGroup.Panel must be used inside TabGroup");
  }
  const isActive = ctx.active === id;

  return (
    <div
      id={`tabpanel-${id}`}
      role="tabpanel"
      aria-labelledby={`tab-${id}`}
      aria-hidden={!isActive}
      className={cn(
        "col-start-1 row-start-1 min-w-0 rounded-b-lg border border-t-0 border-zinc-300 bg-white p-4 shadow-sm",
        !isActive && "pointer-events-none invisible",
        className,
      )}
    >
      {children}
    </div>
  );
}

type TabGroupProps = {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
  children: ReactNode;
  className?: string;
  panelsClassName?: string;
  minHeight?: string;
};

export function TabGroup({
  tabs,
  active,
  onChange,
  children,
  className,
  panelsClassName,
  minHeight = "min-h-[24rem]",
}: TabGroupProps) {
  const stableChange = useStableTabChange(onChange);
  const value = useMemo(
    () => ({ active, onChange: stableChange }),
    [active, stableChange],
  );

  const panels = Children.toArray(children).filter(isValidElement) as ReactElement<
    TabGroupPanelProps
  >[];

  return (
    <TabGroupContext.Provider value={value}>
      <div className={cn("overflow-hidden rounded-lg border border-zinc-300", className)}>
        <Tabs
          tabs={tabs}
          active={active}
          onChange={stableChange}
          sticky={false}
          className="border-b border-zinc-300"
        />
        <div
          className={cn(
            "grid [&>*]:col-start-1 [&>*]:row-start-1",
            minHeight,
            panelsClassName,
          )}
        >
          {panels}
        </div>
      </div>
    </TabGroupContext.Provider>
  );
}

TabGroup.Panel = TabGroupPanel;
