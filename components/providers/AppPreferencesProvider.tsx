"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { CountryCodeFormat, CountryOption } from "@/lib/countries/types";

type AppPreferencesContextValue = {
  countryCodeFormat: CountryCodeFormat;
  countries: CountryOption[];
  loading: boolean;
  error: string | null;
  countryLabel: (code: string) => string;
  setCountryCodeFormat: (format: CountryCodeFormat) => Promise<void>;
  defaultCountryCode: string;
};

const AppPreferencesContext = createContext<AppPreferencesContextValue | null>(
  null,
);

function buildLabelMap(countries: CountryOption[]) {
  const map = new Map<string, string>();
  for (const c of countries) {
    map.set(c.code, c.name);
    map.set(c.alpha2, c.name);
    map.set(c.alpha3, c.name);
  }
  const us = map.get("US");
  if (us) map.set("USA", us);
  return map;
}

export function AppPreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [countryCodeFormat, setFormatState] =
    useState<CountryCodeFormat>("alpha2");
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [labelMap, setLabelMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCountries = useCallback(async (format: CountryCodeFormat) => {
    const res = await fetch(`/api/countries?format=${format}`);
    if (!res.ok) throw new Error("Could not load countries");
    const json = await res.json();
    const list: CountryOption[] = json.countries ?? [];
    setCountries(list);
    setLabelMap(buildLabelMap(list));
  }, []);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const settingsRes = await fetch("/api/settings");
      const fmt: CountryCodeFormat =
        settingsRes.ok &&
        (await settingsRes.json()).countryCodeFormat === "alpha3"
          ? "alpha3"
          : "alpha2";
      setFormatState(fmt);
      await loadCountries(fmt);
    } catch {
      setError("Failed to load country list. Refresh the page.");
    } finally {
      setLoading(false);
    }
  }, [loadCountries]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const setCountryCodeFormat = useCallback(
    async (format: CountryCodeFormat) => {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countryCodeFormat: format }),
      });
      if (!res.ok) throw new Error("Could not save settings");
      setFormatState(format);
      await loadCountries(format);
    },
    [loadCountries],
  );

  const countryLabel = useCallback(
    (code: string) => {
      if (!code || code === "—") return "—";
      return labelMap.get(code.toUpperCase()) ?? code;
    },
    [labelMap],
  );

  const defaultCountryCode = useMemo(() => {
    const ug = countries.find((c) => c.alpha2 === "UG");
    return ug?.code ?? (countryCodeFormat === "alpha2" ? "UG" : "UGA");
  }, [countries, countryCodeFormat]);

  const value = useMemo(
    () => ({
      countryCodeFormat,
      countries,
      loading,
      error,
      countryLabel,
      setCountryCodeFormat,
      defaultCountryCode,
    }),
    [
      countryCodeFormat,
      countries,
      loading,
      error,
      countryLabel,
      setCountryCodeFormat,
      defaultCountryCode,
    ],
  );

  return (
    <AppPreferencesContext.Provider value={value}>
      {children}
    </AppPreferencesContext.Provider>
  );
}

export function useAppPreferences() {
  const ctx = useContext(AppPreferencesContext);
  if (!ctx) {
    throw new Error(
      "useAppPreferences must be used within AppPreferencesProvider",
    );
  }
  return ctx;
}
