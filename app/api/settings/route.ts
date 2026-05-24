import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import type { CountryCodeFormat } from "@/lib/countries/types";
import {
  getUserCountryCodeFormat,
  updateUserCountryCodeFormat,
} from "@/lib/settings/user-settings";

export async function GET() {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const countryCodeFormat = await getUserCountryCodeFormat(Number(user.id));
  return NextResponse.json({ countryCodeFormat });
}

export async function PATCH(request: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const body = await request.json();
  const format = body.countryCodeFormat as CountryCodeFormat;

  if (format !== "alpha2" && format !== "alpha3") {
    return NextResponse.json(
      { error: "countryCodeFormat must be alpha2 or alpha3" },
      { status: 400 },
    );
  }

  await updateUserCountryCodeFormat(Number(user.id), format);
  return NextResponse.json({ countryCodeFormat: format });
}
