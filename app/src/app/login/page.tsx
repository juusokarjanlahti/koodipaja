import Link from "next/link";
import { devLoginEnabled } from "@/lib/auth/session";
import { demoModeEnabled } from "@/lib/demo/mode";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  if (demoModeEnabled() && !devLoginEnabled()) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-border bg-surface p-6">
        <h1 className="mb-2 text-xl font-semibold">Kirjautuminen</h1>
        <p className="mb-4 text-muted">Tämä on Koodipajan demo. Kirjaudu demotunnuksella opiskelijana tai opettajana.</p>
        <Link href="/demo" className="font-bold text-accent underline">
          Kokeile demoa
        </Link>
      </div>
    );
  }

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
      {demoModeEnabled() && (
        <p className="mb-4 text-sm">
          <Link href="/demo" className="font-bold text-accent underline">
            Kokeile demoa
          </Link>{" "}
          opiskelijana tai opettajana.
        </p>
      )}
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
        <button type="submit" className="rounded-lg bg-action px-4 py-2 font-bold text-action-text">
          Kirjaudu
        </button>
      </form>
    </div>
  );
}
