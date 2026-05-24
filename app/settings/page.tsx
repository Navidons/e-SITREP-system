"use client";

import { useState } from "react";
import Link from "next/link";
import { useAppPreferences } from "@/components/providers/AppPreferencesProvider";
import type { CountryCodeFormat } from "@/lib/countries/types";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const {
    countryCodeFormat,
    setCountryCodeFormat,
    loading,
    countries,
  } = useAppPreferences();
  const [pending, setPending] = useState<CountryCodeFormat | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(format: CountryCodeFormat) {
    setPending(format);
    setMessage(null);
    setError(null);
    try {
      await setCountryCodeFormat(format);
      setMessage(
        format === "alpha2"
          ? "Saved. Forms show 2-letter codes (e.g. UG, KE). The database always stores ISO alpha-2."
          : "Saved. Forms show 3-letter codes (e.g. UGA, KEN). The database always stores ISO alpha-2.",
      );
    } catch {
      setError("Could not save. Try again.");
    } finally {
      setPending(null);
    }
  }

  const ug = countries.find((c) => c.alpha2 === "UG");

  return (
    <div className="max-w-lg space-y-6 rounded-lg border border-zinc-300 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">
          Nationality codes
        </h2>
        <p className="mt-1 text-sm text-zinc-700">
          Choose how country codes appear in dropdowns and entry forms. All
          stations share one normalized format in the database (ISO alpha-2);
          your preference only affects what you see when typing and editing.
          Country names come from the REST Countries database.
        </p>
      </div>

      <fieldset className="space-y-3" disabled={loading || pending !== null}>
        <legend className="sr-only">Country code format</legend>
        <label
          className={cn(
            "flex cursor-pointer gap-3 rounded-lg border p-4",
            countryCodeFormat === "alpha2"
              ? "border-emerald-800 bg-emerald-50"
              : "border-zinc-300",
          )}
        >
          <input
            type="radio"
            name="format"
            checked={countryCodeFormat === "alpha2"}
            onChange={() => save("alpha2")}
            className="mt-1"
          />
          <span>
            <span className="font-semibold text-zinc-900">
              2-letter (ISO 3166-1 alpha-2)
            </span>
            <span className="mt-1 block text-sm text-zinc-700">
              Example: {ug ? `${ug.name} — ${ug.alpha2}` : "Uganda — UG"}
            </span>
          </span>
        </label>
        <label
          className={cn(
            "flex cursor-pointer gap-3 rounded-lg border p-4",
            countryCodeFormat === "alpha3"
              ? "border-emerald-800 bg-emerald-50"
              : "border-zinc-300",
          )}
        >
          <input
            type="radio"
            name="format"
            checked={countryCodeFormat === "alpha3"}
            onChange={() => save("alpha3")}
            className="mt-1"
          />
          <span>
            <span className="font-semibold text-zinc-900">
              3-letter (ISO 3166-1 alpha-3)
            </span>
            <span className="mt-1 block text-sm text-zinc-700">
              Example:{" "}
              {ug
                ? `${ug.name} — ${ug.alpha3}`
                : "Uganda — UGA"}
            </span>
          </span>
        </label>
      </fieldset>

      {pending && (
        <p className="text-sm text-zinc-600">Saving…</p>
      )}
      {message && (
        <p className="text-sm font-medium text-emerald-800">{message}</p>
      )}
      {error && (
        <p className="text-sm font-medium text-red-700">{error}</p>
      )}

      <p className="text-xs text-zinc-600">
        {countries.length > 0
          ? `${countries.length} countries loaded. Existing records keep their stored codes; labels still resolve correctly.`
          : "Loading country list…"}
      </p>

      <Link
        href="/dashboard"
        className="inline-flex items-center rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
