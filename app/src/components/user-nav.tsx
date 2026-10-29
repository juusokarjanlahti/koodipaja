import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";

export async function UserNav() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <Link href="/login" className="text-sm font-medium text-accent">
        Kirjaudu
      </Link>
    );
  }
  return (
    <form action="/api/logout" method="post" className="flex items-center gap-3 text-sm">
      <span className="text-muted">{user.displayName ?? user.email}</span>
      <button type="submit" className="font-medium text-accent">
        Kirjaudu ulos
      </button>
    </form>
  );
}
