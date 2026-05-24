"use client";

export type RejectedAlert = {
  id: number;
  reportDate: string;
  rejectionReason: string | null;
  rejectedAt: string | null;
  rejectedBy: { fullName: string } | null;
};

export function RejectionBanner({
  reason,
  rejectedBy,
  compact,
}: {
  reason: string;
  rejectedBy?: { fullName: string } | null;
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? "rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-950"
          : "rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-950"
      }
    >
      <p className="font-semibold">Report returned — action required</p>
      <p className="mt-1 whitespace-pre-wrap">{reason}</p>
      {rejectedBy && (
        <p className="mt-1 text-xs text-red-800">Rejected by {rejectedBy.fullName}</p>
      )}
      {!compact && (
        <p className="mt-2 text-red-900">
          Update entries or request corrections as needed, reconcile totals, then{" "}
          <span className="font-semibold">Submit day</span> to send back to HQ.
        </p>
      )}
    </div>
  );
}

export function RejectionAlertsList({
  alerts,
  onOpenDay,
}: {
  alerts: RejectedAlert[];
  onOpenDay: (date: string) => void;
}) {
  if (alerts.length === 0) return null;

  return (
    <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 space-y-2">
      <p className="text-sm font-semibold text-red-950">
        {alerts.length} day{alerts.length === 1 ? "" : "s"} returned by HQ
      </p>
      <ul className="space-y-2 text-sm text-red-900">
        {alerts.map((a) => (
          <li key={a.id} className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <button
                type="button"
                className="font-semibold underline hover:no-underline"
                onClick={() => onOpenDay(a.reportDate)}
              >
                {a.reportDate}
              </button>
              {a.rejectionReason && (
                <p className="mt-0.5 text-red-800 line-clamp-2">
                  {a.rejectionReason}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
