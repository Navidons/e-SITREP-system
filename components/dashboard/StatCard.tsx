"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

type Props = {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  iconColor?: string;
  trend?: number; // positive = up, negative = down, 0 = flat
  trendLabel?: string;
  accent?: "emerald" | "amber" | "blue" | "rose" | "violet";
  size?: "sm" | "md" | "lg";
  className?: string;
};

const ACCENTS = {
  emerald: {
    icon: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    value: "text-emerald-950",
    trendUp: "text-emerald-700 bg-emerald-100",
    trendDown: "text-rose-700 bg-rose-50",
  },
  amber: {
    icon: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    value: "text-amber-950",
    trendUp: "text-emerald-700 bg-emerald-100",
    trendDown: "text-rose-700 bg-rose-50",
  },
  blue: {
    icon: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    value: "text-blue-950",
    trendUp: "text-emerald-700 bg-emerald-100",
    trendDown: "text-rose-700 bg-rose-50",
  },
  rose: {
    icon: "text-rose-700",
    bg: "bg-rose-50",
    border: "border-rose-200",
    value: "text-rose-950",
    trendUp: "text-emerald-700 bg-emerald-100",
    trendDown: "text-rose-700 bg-rose-50",
  },
  violet: {
    icon: "text-violet-700",
    bg: "bg-violet-50",
    border: "border-violet-200",
    value: "text-violet-950",
    trendUp: "text-emerald-700 bg-emerald-100",
    trendDown: "text-rose-700 bg-rose-50",
  },
};

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  trend,
  trendLabel,
  accent = "emerald",
  size = "md",
  className,
}: Props) {
  const a = ACCENTS[accent];

  const TrendIcon =
    trend === undefined || trend === 0 ? Minus : trend > 0 ? TrendingUp : TrendingDown;
  const trendClass =
    trend === undefined || trend === 0
      ? "text-zinc-500 bg-zinc-100"
      : trend > 0
        ? a.trendUp
        : a.trendDown;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md",
        a.border,
        className,
      )}
    >
      {/* Decorative accent blob */}
      <div
        className={cn(
          "absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-10",
          a.bg,
        )}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">{label}</p>
          <p
            className={cn(
              "mt-1.5 font-black tabular-nums leading-none",
              size === "lg" ? "text-4xl" : size === "md" ? "text-3xl" : "text-2xl",
              a.value,
            )}
          >
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {sub && <p className="mt-1 text-sm text-zinc-500">{sub}</p>}
        </div>

        {Icon && (
          <div className={cn("rounded-xl p-2.5", a.bg)}>
            <Icon className={cn("h-5 w-5", a.icon)} />
          </div>
        )}
      </div>

      {trend !== undefined && (
        <div className="mt-3 flex items-center gap-1.5">
          <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold", trendClass)}>
            <TrendIcon className="h-3 w-3" />
            {Math.abs(trend)}%
          </span>
          {trendLabel && (
            <span className="text-xs text-zinc-500">{trendLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
