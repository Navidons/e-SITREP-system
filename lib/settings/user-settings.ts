import { prisma } from "@/lib/prisma";
import type { CountryCodeFormat } from "@/lib/countries/types";
import { CountryCodeFormat as PrismaCountryCodeFormat } from "@prisma/client";

export function toPrismaFormat(
  format: CountryCodeFormat,
): PrismaCountryCodeFormat {
  return format === "alpha2"
    ? PrismaCountryCodeFormat.alpha2
    : PrismaCountryCodeFormat.alpha3;
}

export function fromPrismaFormat(
  format: PrismaCountryCodeFormat,
): CountryCodeFormat {
  return format === PrismaCountryCodeFormat.alpha3 ? "alpha3" : "alpha2";
}

export async function getUserCountryCodeFormat(
  userId: number,
): Promise<CountryCodeFormat> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { countryCodeFormat: true },
  });
  return user ? fromPrismaFormat(user.countryCodeFormat) : "alpha2";
}

export async function updateUserCountryCodeFormat(
  userId: number,
  format: CountryCodeFormat,
) {
  return prisma.user.update({
    where: { id: userId },
    data: { countryCodeFormat: toPrismaFormat(format) },
    select: { countryCodeFormat: true },
  });
}
