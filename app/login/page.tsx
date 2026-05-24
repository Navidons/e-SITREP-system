import { loginAction } from "@/app/login/actions";
import { User, Lock, ShieldCheck, AlertCircle } from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  credentials: "Invalid username or password.",
  missing: "Enter username and password.",
};

type PageProps = {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? "/dashboard";
  const errorMessage = params.error
    ? (ERROR_MESSAGES[params.error] ?? "Sign-in failed.")
    : null;

  return (
    <main className="flex h-dvh items-center justify-center bg-gradient-to-tr from-emerald-950 via-[#0d3b2e] to-[#0a2f24] px-4 text-zinc-900">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-white/10 transition-all duration-200">
        
        {/* Header Block with Ministry Branding */}
        <div className="border-b border-zinc-150 bg-gradient-to-b from-[#0a2f24] to-[#0d3b2e] px-6 py-6 text-center text-white relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#e8c547]" />
          
          <div
            className="mx-auto mb-3.5 flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-[#061f17]/80 text-[#e8c547] shadow-lg shadow-black/10"
            aria-hidden
          >
            <ShieldCheck className="h-7 w-7" />
          </div>
          
          <p className="text-[10px] font-black uppercase tracking-widest text-[#e8c547]">
            Republic of Uganda
          </p>
          <h1 className="mt-1 text-base font-extrabold leading-snug tracking-tight">
            Ministry of Internal Affairs
          </h1>
          <p className="mt-1 text-xs font-bold text-emerald-300 uppercase tracking-wider">
            e-SITREP Portal
          </p>
        </div>

        {/* Input Form */}
        <form action={loginAction} className="space-y-5 p-6 bg-white">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />

          {errorMessage ? (
            <div className="flex gap-2.5 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-950">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
              <div className="space-y-0.5">
                <p className="font-bold">Sign-in Alert</p>
                <p className="text-xs text-red-800">{errorMessage}</p>
              </div>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label
              htmlFor="username"
              className="block text-xs font-bold uppercase tracking-wider text-zinc-600"
            >
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-zinc-450">
                <User className="h-4 w-4 text-zinc-400" />
              </div>
              <input
                id="username"
                name="username"
                autoComplete="username"
                required
                placeholder="Enter username"
                className="w-full rounded-lg border border-zinc-300 bg-white pl-10 pr-4 py-2.5 text-sm text-zinc-900 shadow-sm transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none placeholder:text-zinc-400"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-xs font-bold uppercase tracking-wider text-zinc-600"
            >
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-zinc-450">
                <Lock className="h-4 w-4 text-zinc-400" />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="w-full rounded-lg border border-zinc-300 bg-white pl-10 pr-4 py-2.5 text-sm text-zinc-900 shadow-sm transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 outline-none placeholder:text-zinc-400"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-[#0d3b2e] py-3 text-sm font-bold text-white shadow-md shadow-emerald-950/10 hover:bg-[#0a2f24] active:scale-[0.99] transition-all duration-150 cursor-pointer"
          >
            Sign In
          </button>
        </form>
      </div>
    </main>
  );
}
