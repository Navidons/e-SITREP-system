import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import type { CountryCodeFormat } from "@/lib/countries/types";
import {
  loadCountries,
  sortCountryOptions,
  toCountryOptions,
} from "@/lib/countries/service";
import { getUserCountryCodeFormat } from "@/lib/settings/user-settings";

export async function GET(request: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const { searchParams } = new URL(request.url);
  const formatParam = searchParams.get("format") as CountryCodeFormat | null;
  const format =
    formatParam === "alpha2" || formatParam === "alpha3"
      ? formatParam
      : await getUserCountryCodeFormat(Number(user.id));

  try {
    const countries = await loadCountries();
    const options = sortCountryOptions(
      toCountryOptions(countries, format),
      format,
    );

    return NextResponse.json(
      { format, countries: options },
      {
        headers: {
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        },
      },
    );
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to load countries";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
