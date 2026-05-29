import { loginAction } from "@/app/login/actions";
import { LoginForm } from "@/components/auth/LoginForm";

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
    <main className="flex h-dvh items-center justify-center bg-[#0d3b2e] px-4 text-zinc-900">
      <div className="w-full max-w-sm rounded-lg bg-white shadow-lg">
        <div className="border-b border-zinc-200 bg-[#0d3b2e] px-6 py-5 text-center">
          <div
            className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#e8c547] bg-[#0a2f24]"
            aria-hidden
          >
            <svg viewBox="0 0 24 24" className="h-7 w-7 text-[#e8c547]">
              <path
                fill="currentColor"
                d="M12 2l2.2 6.8H21l-5.5 4 2.1 6.7L12 15.5 6.4 19.5l2.1-6.7L3 8.8h6.8L12 2z"
              />
            </svg>
          </div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#e8c547]">
            Republic of Uganda
          </p>
          <h1 className="mt-1.5 text-base font-bold leading-snug text-white">
            Ministry of Internal Affairs
          </h1>
          <p className="mt-1 text-sm font-semibold text-white">e-SITREP</p>
        </div>

        <LoginForm
          action={loginAction}
          callbackUrl={callbackUrl}
          errorMessage={errorMessage}
        />
      </div>
    </main>
  );
}
