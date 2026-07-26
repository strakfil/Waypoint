# Waypoint

Plánování cest, míst k přespání a pitné vody na jedné mapě. Next.js (App Router) + Supabase, nasazeno jako PWA — funguje na macOS i na iPhonu (přidání na plochu).

## Stav: v0.1 — kostra + přihlašování

Co tahle verze umí:
- Přihlášení přes e-mail (magic link), Apple nebo Google (Supabase Auth)
- Middleware, které chrání všechny stránky kromě `/login`
- Základní DB schéma pro celý produkt (místa, hodnocení, seznamy, trasy) — viz `supabase/migrations/0001_init.sql`
- PWA manifest (přidání na plochu na iPhonu)

Co ještě chybí (další verze): mapa a ukládání míst (v0.2), wishlisty (v0.3), plánování tras + Waze (v0.4).

## Založení projektu

### 1. Supabase
1. Vytvoř nový projekt na [supabase.com](https://supabase.com).
2. V **Project Settings → API** zkopíruj `Project URL` a `anon public key`.
3. V **SQL Editor** spusť obsah `supabase/migrations/0001_init.sql`.
4. V **Authentication → Providers** zapni:
   - Email (magic link je zapnutý defaultně)
   - Apple (potřebuješ Services ID + Key z Apple Developer účtu)
   - Google (volitelně, jako záloha)
5. V **Authentication → URL Configuration** přidej redirect URL:
   - `http://localhost:3000/auth/callback` (lokální vývoj)
   - `https://tvuj-vercel-domain.vercel.app/auth/callback` (produkce, doplníš po prvním deployi)

### 2. Lokální vývoj
```bash
npm install
cp .env.example .env.local
# doplň NEXT_PUBLIC_SUPABASE_URL a NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```
Aplikace poběží na http://localhost:3000.

### 3. Nasazení na Vercel
1. Pushni repo na GitHub.
2. Na [vercel.com](https://vercel.com) → **New Project** → vyber repo.
3. Přidej environment variables (stejné jako v `.env.local`).
4. Deploy. Po prvním deployi doplň produkční URL do Supabase redirect URLs (krok 1.5 výše).

## Struktura projektu
```
app/
  login/            přihlašovací stránka
  auth/callback/    výměna OAuth/magic-link kódu za session
  page.tsx          hlavní stránka (zatím placeholder dashboard)
lib/supabase/       browser/server/middleware klienti pro Supabase
supabase/migrations/ SQL schéma databáze
```

## Datový model (v0.1)
- `profiles` — veřejný profil navázaný na `auth.users`
- `places` — libovolné místo (voda / spací místo / ferrata / hiking / vlastní), s geolokací (PostGIS) a rozlišením `source` (uživatel vs. OpenStreetMap import)
- `ratings` — hodnocení místa (1–5 + komentář), jeden uživatel = jedno hodnocení na místo
- `lists` + `list_items` — vlastní seznamy/wishlisty s libovolnými místy
- `trips` + `trip_stops` — trasa jako seřazená sekvence zastávek, se stavem (`planned`/`active`/`done`) a hodnocením úseku

## Roadmap
| Verze | Obsah |
|---|---|
| v0.1 | Kostra, auth, DB schéma ✅ |
| v0.2 | Mapa (MapLibre), ukládání míst, import pitné vody z OSM |
| v0.3 | Wishlisty / vlastní seznamy |
| v0.4 | Plánování tras, proklikávání úseků, Waze deep link, hodnocení úseku |
| v0.5+ | Offline mapy, sdílení tripů, import GPX |

## Poznámky
- Ikony v `public/icons/` jsou jen placeholder (vygenerované skriptem) — nahraď vlastním app iconem, až budeš mít vizuální identitu hotovou.
- Apple Sign-In vyžaduje platný Apple Developer účet a nastavení Services ID — pokud chceš pro v0.1 jen rychle otestovat, stačí zapnout jen e-mail magic link a Google.
