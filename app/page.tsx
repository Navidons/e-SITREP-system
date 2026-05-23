import { auth } from "@/auth";
import { homePathForRoles } from "@/lib/rbac";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect(homePathForRoles(session.user.roles));
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-emerald-950 px-4 text-center text-white">
      <h1 className="text-4xl font-bold">e-SITREP</h1>
      <p className="mt-2 max-w-lg text-white/95">
        Automating daily and weekly border situation reports for NCIC — 60+
        stations, HQ workflow, consolidated SITREP, and Excel exports.
      </p>
      <Link
        href="/login"
        className="mt-8 rounded-md bg-white px-6 py-3 font-medium text-emerald-900 hover:bg-emerald-50"
      >
        Sign in to demo
      </Link>
    </div>
  );
}
