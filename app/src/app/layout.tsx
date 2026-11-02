import type { Metadata } from "next";
import Link from "next/link";
import { UserNav } from "@/components/user-nav";
import { getCurrentUser } from "@/lib/auth/session";
import { DEFAULT_ACCENT } from "@/lib/theme/accents";
import "./globals.css";

export const metadata: Metadata = {
  title: "Koodipaja",
  description: "Avoin ohjelmointitehtäväalusta",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Rendered on the server so the chosen accent is there on first paint, without a flash.
  const accent = (await getCurrentUser())?.accent ?? DEFAULT_ACCENT;
  return (
    <html lang="fi" data-accent={accent}>
      <body className="min-h-screen antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded focus:bg-surface focus:px-3 focus:py-2"
        >
          Siirry sisältöön
        </a>
        <header className="border-b border-grid bg-bg print:hidden">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="kp-wordmark text-xl font-extrabold tracking-tight">
              Koodipaja
            </Link>
            <UserNav />
          </div>
        </header>
        <main id="main" className="mx-auto max-w-6xl px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
