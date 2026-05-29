import { cn } from "@/lib/utils";

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block text-sm", className)}>
      <span className="font-semibold text-zinc-900">{label}</span>
      {hint && <span className="mt-0.5 block text-xs font-normal text-zinc-600">{hint}</span>}
      <div className="mt-1">{children}</div>
      {error && (
        <p className="mt-1 text-xs font-medium text-red-700" role="alert">
          {error}
        </p>
      )}
    </label>
  );
}

export const inputClassName =
  "block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm transition focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 disabled:bg-zinc-100 disabled:text-zinc-500";
