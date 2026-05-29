import { cn } from "@/lib/utils";

const sizes = {
  sm: "h-4 w-4 border-2",
  md: "h-8 w-8 border-[3px]",
  lg: "h-11 w-11 border-4",
};

export function Spinner({
  size = "md",
  className,
  label = "Loading",
}: {
  size?: keyof typeof sizes;
  className?: string;
  /** Accessible name (visually hidden if not shown) */
  label?: string;
}) {
  return (
    <span className="inline-flex" role="status" aria-label={label}>
      <span
        className={cn(
          "inline-block animate-spin rounded-full border-zinc-200 border-t-emerald-800",
          sizes[size],
          className,
        )}
      />
    </span>
  );
}
