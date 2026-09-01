import { login } from "./actions";
import { primaryButtonClass } from "@/components/ui/Field";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; from?: string }>;
}) {
  const params = await searchParams;
  const redirectTo = params.from ?? "/dashboard";

  return (
    <div className="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden bg-neutral-950 px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/20 blur-[100px]"
      />
      <div className="relative w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold text-neutral-50">Dashboard</h1>
          <p className="text-sm text-neutral-400">Enter your password to continue</p>
        </div>
        <form action={login} className="space-y-4">
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <input
            type="password"
            name="password"
            placeholder="Password"
            autoFocus
            required
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2.5 text-neutral-50 placeholder:text-neutral-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          {params.error && (
            <p className="text-sm text-red-400">Incorrect password. Try again.</p>
          )}
          <button type="submit" className={`w-full ${primaryButtonClass}`}>
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
