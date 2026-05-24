import { auth } from "@/auth";
import { homePathForRoles } from "@/lib/rbac";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, ArrowRight } from "lucide-react";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect(homePathForRoles(session.user.roles));
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-tr from-emerald-950 via-[#0d3b2e] to-[#0a2f24] px-4 text-center text-white relative">
      {/* Top Accent Strip */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-[#e8c547]" />

      <div className="max-w-xl space-y-6 bg-emerald-900/20 p-8 rounded-2xl border border-white/10 backdrop-blur-sm shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-[#061f17]/80 text-[#e8c547] shadow-lg">
          <ShieldCheck className="h-9 w-9" />
        </div>

        <div className="space-y-2">
          <p className="text-xxs font-black uppercase tracking-widest text-[#e8c547]">
            Republic of Uganda · Ministry of Internal Affairs
          </p>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl text-white">
            e-SITREP
          </h1>
          <p className="text-sm font-bold text-emerald-300 uppercase tracking-wider">
            Border Situation Report Automation System
          </p>
        </div>

        <p className="mx-auto max-w-md text-sm text-zinc-200/90 leading-relaxed font-medium">
          Automating daily and weekly border situation reports for NCIC. Streamlining data entry across 60+ border stations, facilitating HQ review workflows, generating consolidated SITREPs, and managing weekly Excel exports.
          </p>

        <div className="pt-4">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-emerald-950 shadow-lg transition hover:bg-emerald-50 active:scale-[0.98]"
          >
            <span>Sign In to Portal</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <footer className="absolute bottom-6 text-[10px] font-semibold text-zinc-400/80 uppercase tracking-widest">
        National Coordination Center (NCIC) · © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
