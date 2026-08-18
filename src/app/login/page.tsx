import { IconShieldCheck } from "@/components/icons";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <IconShieldCheck className="text-lg" />
          </div>
          <h1 className="text-lg font-semibold">Compliance Agent</h1>
          <p className="mt-1 text-sm text-foreground/50">Sign in to continue</p>
        </div>

        <form action={login} className="flex flex-col gap-3">
          <div>
            <label htmlFor="email" className="mb-1 block text-xs font-medium text-foreground/70">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm outline-none focus:border-accent/60"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-xs font-medium text-foreground/70"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm outline-none focus:border-accent/60"
            />
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}

          <button
            type="submit"
            className="mt-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 cursor-pointer"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
