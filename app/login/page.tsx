"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setStatus(error ? "error" : "sent");
  }

  async function signInWithProvider(provider: "apple" | "google") {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <main className="contour-bg flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <p className="mb-1 font-mono text-xs uppercase tracking-[0.2em] text-trail">
            49.1951° N · 16.6068° E
          </p>
          <h1 className="text-5xl font-semibold text-ink">Waypoint</h1>
          <p className="mt-2 text-sm text-ink/60">
            Trasy, tábořiště a pitná voda na jedné mapě.
          </p>
        </div>

        <div className="space-y-3 rounded-xl border border-line bg-white/60 p-6 shadow-sm">
          <button
            onClick={() => signInWithProvider("apple")}
            className="flex w-full items-center justify-center rounded-lg bg-ink py-2.5 text-sm font-medium text-paper transition hover:bg-ink/90"
          >
            Pokračovat přes Apple
          </button>
          <button
            onClick={() => signInWithProvider("google")}
            className="flex w-full items-center justify-center rounded-lg border border-line bg-white py-2.5 text-sm font-medium text-ink transition hover:bg-paper"
          >
            Pokračovat přes Google
          </button>

          <div className="relative py-2 text-center">
            <span className="bg-white/60 px-2 text-xs text-ink/40">nebo</span>
            <div className="absolute inset-x-0 top-1/2 -z-10 h-px bg-line" />
          </div>

          <form onSubmit={sendMagicLink} className="space-y-2">
            <input
              type="email"
              required
              placeholder="tvuj@email.cz"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:border-moss"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-moss py-2.5 text-sm font-medium text-paper transition hover:bg-moss-light"
            >
              Poslat přihlašovací odkaz
            </button>
          </form>

          {status === "sent" && (
            <p className="text-center text-sm text-moss">
              Odkaz je na cestě — zkontroluj e-mail.
            </p>
          )}
          {status === "error" && (
            <p className="text-center text-sm text-gold">
              Něco se nepovedlo. Zkus to prosím znovu.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
