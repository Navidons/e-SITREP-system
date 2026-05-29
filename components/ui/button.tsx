import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  loading?: boolean;
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  children,
  ...props
}: Props) {
  const variants = {
    primary: "bg-emerald-800 text-white hover:bg-emerald-900",
    secondary: "border border-zinc-300 bg-white hover:bg-zinc-50",
    danger: "bg-red-700 text-white hover:bg-red-800",
    ghost: "text-zinc-700 hover:bg-zinc-100",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
  };
  const spinnerOnDark =
    variant === "primary" || variant === "danger";

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <Spinner
          size="sm"
          className={cn(
            spinnerOnDark
              ? "border-white/30 border-t-white"
              : "border-zinc-300 border-t-emerald-800",
          )}
        />
      ) : null}
      {children}
    </button>
  );
}
