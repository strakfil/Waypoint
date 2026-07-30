import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "./sign-out-button";

const upcoming = [
  { label: "Trasy a Waze", note: "plánování + navigace po úsecích", eta: "v0.4" },
];

export default async function Home() {
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
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-trail">
              Základní tábor
            </p>
            <h1 className="text-4xl font-semibold text-ink">Ahoj, {user.email}</h1>
          </div>
          <SignOutButton />
        </header>

        <section className="mb-3">
          <Link
            href="/map"
            className="flex items-center justify-between rounded-xl border border-line bg-moss/10 px-5 py-4 transition hover:bg-moss/20"
          >
            <div>
              <p className="font-medium text-ink">Mapa a místa</p>
              <p className="text-sm text-ink/50">voda · tábořiště · ferraty</p>
            </div>
            <span className="rounded-full bg-moss px-3 py-1 font-mono text-xs text-paper">
              otevřít →
            </span>
          </Link>
        </section>

        <section className="mb-3">
          <Link
            href="/lists"
            className="flex items-center justify-between rounded-xl border border-line bg-moss/10 px-5 py-4 transition hover:bg-moss/20"
          >
            <div>
              <p className="font-medium text-ink">Wishlisty</p>
              <p className="text-sm text-ink/50">vlastní seznamy míst</p>
            </div>
            <span className="rounded-full bg-moss px-3 py-1 font-mono text-xs text-paper">
              otevřít →
            </span>
          </Link>
        </section>

        <section className="space-y-3">
          {upcoming.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-xl border border-line bg-white/60 px-5 py-4"
            >
              <div>
                <p className="font-medium text-ink">{item.label}</p>
                <p className="text-sm text-ink/50">{item.note}</p>
              </div>
              <span className="rounded-full bg-moss/10 px-3 py-1 font-mono text-xs text-moss">
                {item.eta}
              </span>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
