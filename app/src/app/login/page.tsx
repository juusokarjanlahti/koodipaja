import { devLoginEnabled } from "@/lib/auth/session";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  if (!devLoginEnabled()) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-border bg-surface p-6">
        <h1 className="mb-2 text-xl font-semibold">Kirjautuminen</h1>
        <p className="text-muted">Kirjaudu oppilaitoksesi Moodlen kautta avaamalla tehtävä sieltä.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md rounded-xl border border-border bg-surface p-6">
      <h1 className="mb-1 text-xl font-semibold">Kirjaudu (kehitystila)</h1>
      <p className="mb-4 text-sm text-muted">
        Kehitystilan kirjautuminen ei tarkista salasanaa. Tuotannossa kirjautuminen tapahtuu Moodlen kautta.
      </p>
      <form action="/api/dev-login" method="post" className="grid gap-3">
        <input type="hidden" name="next" value={next ?? "/"} />
        <label htmlFor="email" className="text-sm font-medium">
          Sähköposti
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          aria-describedby={error ? "email-error" : undefined}
          className="rounded-lg border border-border bg-bg px-3 py-2"
        />
        {error && (
          <p id="email-error" className="text-sm text-fail">
            Tarkista sähköpostiosoite.
          </p>
        )}
        <button type="submit" className="rounded-lg bg-accent px-4 py-2 font-medium text-accent-text">
          Kirjaudu
        </button>
      </form>
    </div>
  );
}
