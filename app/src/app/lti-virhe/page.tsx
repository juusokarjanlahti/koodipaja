import type { Metadata } from "next";

export const metadata: Metadata = { title: "Moodle-kirjautuminen ei onnistunut – Koodipaja" };

const MESSAGES: Record<string, { what: string; todo: string }> = {
  platform: {
    what: "Koodipaja ei tunnista Moodlea, josta tulit.",
    todo: "Kerro tästä opettajalle. Moodlen ylläpitäjän pitää rekisteröidä Koodipaja.",
  },
  state: {
    what: "Kirjautuminen vanheni tai keskeytyi.",
    todo: "Palaa Moodleen ja avaa Koodipaja-aktiviteetti uudelleen.",
  },
  token: {
    what: "Moodlen lähettämää kirjautumista ei voitu varmistaa.",
    todo: "Palaa Moodleen ja avaa aktiviteetti uudelleen. Jos sama toistuu, kerro opettajalle.",
  },
  role: {
    what: "Tehtävien valitseminen Moodlesta on vain kurssin opettajille.",
    todo: "Jos olet kurssin opettaja, tarkista roolisi Moodlen kurssilla.",
  },
  choice: {
    what: "Tehtävien valinta vanheni tai keskeytyi.",
    todo: "Palaa Moodleen ja valitse sisältö uudelleen aktiviteetin asetuksista.",
  },
  iframe: {
    what: "Koodipaja avautui Moodle-sivun sisään upotettuna, jolloin selain estää kirjautumisen.",
    todo: "Opettaja: muuta aktiviteetin asetuksista avautumistavaksi uusi ikkuna (Launch container: New window).",
  },
};

export default async function LtiErrorPage({ searchParams }: { searchParams: Promise<{ koodi?: string }> }) {
  const { koodi } = await searchParams;
  const message = MESSAGES[koodi ?? ""] ?? MESSAGES.token;
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">Moodle-kirjautuminen ei onnistunut</h1>
      <p>{message.what}</p>
      <p>{message.todo}</p>
    </div>
  );
}
