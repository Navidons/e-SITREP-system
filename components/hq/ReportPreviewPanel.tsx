"use client";

import { DailySummaryTable } from "@/components/forms/DailySummaryTable";
import { EntebbeSummaryTable } from "@/components/station/EntebbeSummaryTable";
import { ENTRY_LABELS } from "@/lib/station/entry-config";
import { ReportingProfile } from "@/lib/station/entry-config";
import { useAppPreferences } from "@/components/providers/AppPreferencesProvider";
import { LoadingBlock } from "@/components/ui/loading";
import type { DayData } from "@/components/station/shared-day-types";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-UG", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ReportPreviewPanel({
  data,
  loading,
}: {
  data: DayData | null;
  loading?: boolean;
}) {
  const { countryLabel } = useAppPreferences();

  if (loading) {
    return (
      <LoadingBlock
        message="Loading report from database…"
        className="min-h-[16rem]"
      />
    );
  }

  if (!data) {
    return (
      <p className="py-8 text-center text-sm font-medium text-zinc-600">
        Select a report to preview station data before review or approval.
      </p>
    );
  }

  const isAir =
    data.station?.reportingProfile === ReportingProfile.air ||
    data.station?.reportingProfile === "air";

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
        <h3 className="text-base font-bold text-zinc-900">
          {data.station?.name ?? "Station"} — {data.reportDate}
        </h3>
        <p className="mt-1 text-sm text-zinc-700">
          Status:{" "}
          <span className="font-semibold uppercase">{data.status}</span>
          {data.entryCount != null && ` · ${data.entryCount} entries`}
        </p>
        {data.status === "rejected" && data.rejectionReason && (
          <p className="mt-2 text-sm text-red-900">
            <span className="font-semibold">Rejection reason:</span>{" "}
            {data.rejectionReason}
            {data.rejectedBy && ` (${data.rejectedBy.fullName})`}
          </p>
        )}
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-semibold text-zinc-700">Staff on duty</dt>
          <dd className="text-zinc-900">{data.staffOnDuty ?? 0}</dd>
        </div>
        {!isAir && data.medicalScreening && (
          <div className="sm:col-span-2">
            <dt className="font-semibold text-zinc-700">Medical screening</dt>
            <dd className="text-zinc-900 whitespace-pre-wrap">
              {data.medicalScreening}
            </dd>
          </div>
        )}
        {isAir && (
          <>
            <div>
              <dt className="font-semibold text-zinc-700">Inadmissible</dt>
              <dd className="text-zinc-900">{data.inadmissibleCount ?? 0}</dd>
            </div>
            {data.staffLeaveNotes && (
              <div className="sm:col-span-2">
                <dt className="font-semibold text-zinc-700">Staff on leave</dt>
                <dd className="text-zinc-900 whitespace-pre-wrap">
                  {data.staffLeaveNotes}
                </dd>
              </div>
            )}
          </>
        )}
        {data.generalRemarks && (
          <div className="sm:col-span-2">
            <dt className="font-semibold text-zinc-700">General remarks</dt>
            <dd className="text-zinc-900 whitespace-pre-wrap">
              {data.generalRemarks}
            </dd>
          </div>
        )}
        {data.urgentMatters && (
          <div className="sm:col-span-2">
            <dt className="font-semibold text-zinc-700">Urgent matters</dt>
            <dd className="text-zinc-900 whitespace-pre-wrap">
              {data.urgentMatters}
            </dd>
          </div>
        )}
      </dl>

      {isAir && data.summary.air ? (
        <EntebbeSummaryTable
          stationName={data.station?.name ?? "Airport"}
          reportDate={data.reportDate}
          air={data.summary.air}
          inadmissibleCount={data.inadmissibleCount ?? 0}
          incidentCount={data.incidents?.length ?? 0}
        />
      ) : (
        <DailySummaryTable
          stationName={data.station?.name ?? "Station"}
          reportDate={data.reportDate}
          arrivals={data.summary.arrivals}
          departures={data.summary.departures}
          specialCategories={data.summary.specialCategories}
        />
      )}

      <section>
        <h4 className="mb-2 text-sm font-bold text-zinc-900">Entry log</h4>
        <div className="overflow-x-auto rounded border border-zinc-200">
          <table className="w-full text-sm">
            <thead className="bg-zinc-100 text-left">
              <tr>
                <th className="p-2">Time</th>
                <th className="p-2">Type</th>
                <th className="p-2">Detail</th>
                <th className="p-2">M</th>
                <th className="p-2">F</th>
              </tr>
            </thead>
            <tbody>
              {data.entries.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-zinc-600">
                    No entries
                  </td>
                </tr>
              )}
              {data.entries.map((e) => (
                <tr key={e.id} className="border-t">
                  <td className="p-2">{formatTime(e.recordedAt)}</td>
                  <td className="p-2">{ENTRY_LABELS[e.entryType]}</td>
                  <td className="p-2 max-w-xs">
                    {e.flightNumber
                      ? `${e.flightNumber} ${e.route ?? ""} (shift ${e.shift})`
                      : e.personName
                        ? `${e.personName}${e.passportNo ? ` · ${e.passportNo}` : ""}`
                        : countryLabel(e.nationalityCode ?? "—")}
                    {e.notes && (
                      <span className="block text-xs text-zinc-600">
                        {e.notes}
                      </span>
                    )}
                  </td>
                  <td className="p-2 tabular-nums">{e.male}</td>
                  <td className="p-2 tabular-nums">{e.female}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {(data.incidents?.length ?? 0) > 0 && (
        <section>
          <h4 className="mb-2 text-sm font-bold text-zinc-900">Occurrences</h4>
          <ul className="space-y-2 text-sm">
            {data.incidents!.map((i) => (
              <li key={i.id} className="rounded border border-zinc-200 p-3">
                <span className="font-semibold uppercase text-zinc-700">
                  {i.incidentType?.replace("occurrence_", "Shift ") ?? "Note"}
                </span>
                <p className="mt-1">{i.description}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(data.pendingAmendmentCount ?? 0) > 0 && (
        <p className="text-sm font-medium text-amber-800">
          {data.pendingAmendmentCount} pending correction(s) on this day — see
          corrections queue.
        </p>
      )}
    </div>
  );
}
