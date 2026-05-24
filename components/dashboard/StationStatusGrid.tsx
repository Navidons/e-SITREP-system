"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, AlertCircle, MinusCircle } from "lucide-react";

type Station = {
  id: number;
  name: string;
  arrivals: number;
  departures: number;
  total: number;
  status: string | null;
};

const STATUS_CONFIG = {
  submitted: {
    label: "Submitted",
    icon: Clock,
    classes: "bg-amber-50 border-amber-200 text-amber-800",
    badge: "bg-amber-100 text-amber-800",
  },
  reviewed: {
    label: "Reviewed",
    icon: CheckCircle2,
    classes: "bg-blue-50 border-blue-200 text-blue-800",
    badge: "bg-blue-100 text-blue-800",
  },
  verified: {
    label: "Verified",
    icon: CheckCircle2,
    classes: "bg-teal-50 border-teal-200 text-teal-800",
    badge: "bg-teal-100 text-teal-800",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle2,
    classes: "bg-emerald-50 border-emerald-200 text-emerald-800",
    badge: "bg-emerald-100 text-emerald-800",
  },
  rejected: {
    label: "Rejected",
    icon: AlertCircle,
    classes: "bg-rose-50 border-rose-200 text-rose-800",
    badge: "bg-rose-100 text-rose-800",
  },
  draft: {
    label: "Draft",
    icon: MinusCircle,
    classes: "bg-zinc-50 border-zinc-200 text-zinc-500",
    badge: "bg-zinc-100 text-zinc-600",
  },
};

const NO_REPORT = {
  label: "Not reported",
  icon: MinusCircle,
  classes: "bg-zinc-50 border-zinc-200 text-zinc-400",
  badge: "bg-zinc-100 text-zinc-500",
};

type Props = {
  stations: Station[];
};

export function StationStatusGrid({ stations }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {stations.map((st) => {
        const cfg =
          st.status && st.status in STATUS_CONFIG
            ? STATUS_CONFIG[st.status as keyof typeof STATUS_CONFIG]
            : NO_REPORT;
        const Icon = cfg.icon;

        return (
          <div
            key={st.id}
            className={cn(
              "rounded-xl border p-4 transition-shadow hover:shadow-md",
              cfg.classes,
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-black leading-tight text-zinc-900">{st.name}</p>
              <span
                className={cn(
                  "flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold",
                  cfg.badge,
                )}
              >
                <Icon className="h-3 w-3" />
                {cfg.label}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Arr</p>
                <p className="text-xl font-black tabular-nums text-zinc-900">
                  {st.arrivals.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Dep</p>
                <p className="text-xl font-black tabular-nums text-zinc-900">
                  {st.departures.toLocaleString()}
                </p>
              </div>
            </div>
            {st.total > 0 && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/10">
                <div
                  className="h-full rounded-full bg-current opacity-40"
                  style={{
                    width: `${Math.min(100, (st.arrivals / (st.total || 1)) * 100)}%`,
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
