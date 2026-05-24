import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";

export async function GET() {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const stations = await prisma.borderStation.findMany({
    where: { active: true },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(stations);
}
