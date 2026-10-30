import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { teachesAnyCourse } from "@/lib/teacher/course";

export async function UserNav() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <Link href="/login" className="text-sm font-medium text-accent">
        Kirjaudu
      </Link>
    );
  }
  const teacher = await teachesAnyCourse(user.id);
  return (
    <form action="/api/logout" method="post" className="flex items-center gap-4 text-sm">
      {teacher && (
        <Link href="/opettaja" className="font-medium">
          Opettajan näkymä
        </Link>
      )}
      <Link href="/ohje" className="font-medium">
        Ohje
      </Link>
      <Link href="/muistilista" className="font-medium">
        Muistilista
      </Link>
      <span className="text-muted">{user.displayName ?? user.email}</span>
      <button type="submit" className="font-medium text-accent">
        Kirjaudu ulos
      </button>
    </form>
  );
}
