import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ListsView from "./lists-view";

export default async function ListsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <header className="mb-10 flex items-start justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-trail">Waypoint</p>
            <h1 className="text-4xl font-semibold text-ink">Wishlisty</h1>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink/70 transition hover:bg-white/60"
          >
            Základní tábor
          </Link>
        </header>

        <ListsView />
      </div>
    </main>
  );
}
