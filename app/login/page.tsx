import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; from?: string }>;
}) {
  const params = await searchParams;
  const redirectTo = params.from ?? "/dashboard";

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-sm space-y-6">
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
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2.5 text-neutral-50 placeholder:text-neutral-500 focus:border-neutral-600 focus:outline-none"
          />
          {params.error && (
            <p className="text-sm text-red-400">Incorrect password. Try again.</p>
          )}
          <button
            type="submit"
            className="w-full rounded-lg bg-neutral-50 px-4 py-2.5 font-medium text-neutral-950 transition hover:bg-neutral-200"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
