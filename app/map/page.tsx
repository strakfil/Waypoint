import Link from "next/link";
import MapView from "./map-view";

export default function MapPage() {
  return (
    <main className="h-screen overflow-hidden">
      <header className="flex h-16 items-center justify-between border-b border-line bg-paper px-5">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-trail">Waypoint</p>
          <h1 className="text-2xl font-semibold leading-tight text-ink">Mapa a místa</h1>
        </div>
        <Link
          href="/"
          className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink/70 transition hover:bg-white/60"
        >
          Základní tábor
        </Link>
      </header>
      <div className="relative" style={{ height: "calc(100vh - 4rem)" }}>
        <MapView />
      </div>
    </main>
  );
}