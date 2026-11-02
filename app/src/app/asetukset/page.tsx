import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { ACCENTS, ACCENT_IDS, DEFAULT_ACCENT } from "@/lib/theme/accents";
import { saveAccentAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tallennettu?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <>
        <h1 className="kp-display mb-4">Asetukset</h1>
        <Link
          href="/login?next=/asetukset"
          className="inline-block rounded bg-action px-4 py-2 font-bold text-action-text"
        >
          Kirjaudu sisään
        </Link>
      </>
    );
  }
  const saved = (await searchParams).tallennettu === "1";
  return (
    <>
      <h1 className="kp-display mb-2">Asetukset</h1>
      <p className="mb-6 max-w-prose text-muted">
        Asetukset koskevat vain sinua ja tallentuvat tunnukseesi.
      </p>
      {saved && (
        <p
          role="status"
          className="mb-6 w-fit border border-ok bg-ok-bg px-3 py-2 text-ok"
        >
          Tallennettu.
        </p>
      )}
      <form action={saveAccentAction} className="grid max-w-xl gap-5">
        <fieldset className="grid gap-3">
          <legend className="mb-1 text-xl font-bold">Korostusväri</legend>
          <p className="text-sm text-muted">
            Väri täyttää ratkaistujen tehtävien ruudut. Jokainen vaihtoehto on
            tarkistettu luettavaksi sekä vaaleassa että tummassa tilassa.
          </p>
          {ACCENT_IDS.map((id) => (
            <label
              key={id}
              className="flex w-fit cursor-pointer items-center gap-3 rounded border border-field bg-surface px-3 py-2 has-[:checked]:border-2 has-[:checked]:border-text"
            >
              <input
                type="radio"
                name="accent"
                value={id}
                defaultChecked={user.accent === id}
                className="size-4"
              />
              <span
                aria-hidden="true"
                className="kp-swatch"
                style={
                  {
                    "--swatch-light": ACCENTS[id].light.fill,
                    "--swatch-dark": ACCENTS[id].dark.fill,
                  } as React.CSSProperties
                }
              />
              <span className="font-medium">
                {ACCENTS[id].label}
                {id === DEFAULT_ACCENT && (
                  <span className="font-normal text-muted"> (oletus)</span>
                )}
              </span>
            </label>
          ))}
        </fieldset>
        <button
          type="submit"
          className="w-fit rounded bg-action px-5 py-2 font-bold text-action-text"
        >
          Tallenna
        </button>
      </form>
    </>
  );
}
