import { cn } from "@/lib/utils";

const variants = {
  error: "border-red-200 bg-red-50 text-red-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-950",
  info: "border-blue-200 bg-blue-50 text-blue-950",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
};

export function Alert({
  variant = "info",
  title,
  children,
  className,
  onDismiss,
}: {
  variant?: keyof typeof variants;
  title?: string;
  children: React.ReactNode;
  className?: string;
  onDismiss?: () => void;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-lg border px-4 py-3 text-sm",
        variants[variant],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          {title && <p className="font-semibold">{title}</p>}
          <div className={cn(title && "mt-1")}>{children}</div>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 rounded px-1 text-xs font-semibold opacity-70 hover:opacity-100"
            aria-label="Dismiss"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
