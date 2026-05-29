"use client";

import { useFormStatus } from "react-dom";
import { Spinner } from "@/components/ui/spinner";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded bg-[#0d3b2e] py-2.5 text-sm font-semibold text-white hover:bg-[#0a2f24] disabled:opacity-70"
    >
      {pending && (
        <Spinner
          size="sm"
          className="border-zinc-400 border-t-white"
          label="Signing in"
        />
      )}
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

export function LoginForm({
  action,
  callbackUrl,
  errorMessage,
}: {
  action: (formData: FormData) => void | Promise<void>;
  callbackUrl: string;
  errorMessage: string | null;
}) {
  return (
    <form action={action} className="space-y-4 p-6">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      {errorMessage ? (
        <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
          {errorMessage}
        </p>
      ) : null}

      <div>
        <label
          htmlFor="username"
          className="mb-1 block text-sm font-semibold text-zinc-900"
        >
          Username
        </label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          required
          disabled={false}
          className="w-full rounded border border-zinc-400 bg-white px-3 py-2 text-sm text-zinc-900 disabled:bg-zinc-100"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-1 block text-sm font-semibold text-zinc-900"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded border border-zinc-400 bg-white px-3 py-2 text-sm text-zinc-900"
        />
      </div>

      <SubmitButton />
    </form>
  );
}
