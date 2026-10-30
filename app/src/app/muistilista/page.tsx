import Link from "next/link";
import { CheatsheetView } from "@/components/cheatsheet";
import { getCurrentUser } from "@/lib/auth/session";
import { getCheatsheet } from "@/lib/concepts/queries";

export const dynamic = "force-dynamic";

export default async function CheatsheetPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="rounded-xl border border-border bg-surface p-5">
        <p className="mb-3">Kirjaudu sisään nähdäksesi oman muistilistasi.</p>
        <Link href="/login?next=/muistilista" className="inline-block rounded-lg bg-accent px-4 py-2 font-medium text-accent-text">
          Kirjaudu
        </Link>
      </div>
    );
  }
  const cards = await getCheatsheet(user.id);
  return (
    <>
      <h1 className="mb-1 text-2xl font-semibold">Oma muistilista</h1>
      <p className="mb-6 text-muted print:hidden">
        Kaikki tähän mennessä oppimasi asiat yhdessä paikassa. Lista kasvaa jokaisesta palauttamastasi tehtävästä.
      </p>
      <CheatsheetView cards={cards} full />
    </>
  );
}
