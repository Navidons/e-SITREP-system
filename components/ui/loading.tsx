import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

export function LoadingBlock({
  message = "Loading…",
  hint = "This may take longer on slow connections.",
  className,
  size = "lg",
}: {
  message?: string;
  hint?: string | null;
  className?: string;
  size?: "md" | "lg";
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-10 text-center",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Spinner size={size} />
      <p className="text-sm font-medium text-zinc-700">{message}</p>
      {hint ? (
        <p className="max-w-xs text-xs text-zinc-500">{hint}</p>
      ) : null}
    </div>
  );
}

/** Covers a positioned parent while data loads. */
export function LoadingOverlay({
  message = "Loading…",
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 z-10 flex items-center justify-center rounded-lg",
        "bg-white/85 backdrop-blur-[2px]",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <LoadingBlock message={message} hint={null} className="py-6" size="md" />
    </div>
  );
}

export function TableSkeleton({
  rows = 6,
  cols = 4,
  className,
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("animate-pulse space-y-2 p-3", className)}
      role="status"
      aria-label="Loading table"
      aria-busy="true"
    >
      <div className="flex gap-2">
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={i}
            className="h-8 flex-1 rounded bg-zinc-200"
            style={{ opacity: 1 - i * 0.08 }}
          />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-2">
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className="h-10 flex-1 rounded bg-zinc-100"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-xl border border-zinc-200 p-6", className)}
      role="status"
      aria-busy="true"
    >
      <div className="h-4 w-1/3 rounded bg-zinc-200" />
      <div className="mt-4 h-24 rounded bg-zinc-100" />
      <div className="mt-3 h-4 w-2/3 rounded bg-zinc-100" />
    </div>
  );
}
