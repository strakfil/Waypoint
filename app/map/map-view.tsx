"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import maplibregl, { Map as MapLibreMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { createClient } from "@/lib/supabase/client";
import { fetchDrinkingWater } from "@/lib/overpass";
import { PLACE_TYPE_META, type Place, type PlaceType } from "@/lib/places";
import type { ListSummary } from "@/lib/lists";

const BRNO = { lat: 49.1951, lng: 16.6068 };
const MIN_AUTO_FETCH_ZOOM = 13;
const MIN_MS_BETWEEN_FETCHES = 8000;

export default function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const placesRef = useRef<Place[]>([]);
  const lastFetchBoundsRef = useRef<maplibregl.LngLatBounds | null>(null);
  const lastFetchTimeRef = useRef<number>(0);
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userMarkerRef = useRef<Marker | null>(null);
  const geoWatchIdRef = useRef<number | null>(null);
  const userPositionRef = useRef<{ lat: number; lng: number } | null>(null);

  const [places, setPlaces] = useState<Place[]>([]);
  const [zoom, setZoom] = useState(12);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [draft, setDraft] = useState<{ lat: number; lng: number } | null>(null);
  const [draftType, setDraftType] = useState<PlaceType>("custom");
  const [draftName, setDraftName] = useState("");
  const [draftNote, setDraftNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [userLists, setUserLists] = useState<ListSummary[]>([]);
  const [addToListMessage, setAddToListMessage] = useState<string | null>(null);
  const [newListName, setNewListName] = useState("");
  const [addingToList, setAddingToList] = useState(false);

  const supabase = createClient();

  const loadLists = useCallback(async () => {
    const { data, error } = await supabase
      .from("lists_with_counts")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      setUserLists(data as ListSummary[]);
    }
  }, [supabase]);

  async function addPlaceToList(listId: string) {
    if (!selectedPlace) return;
    setAddingToList(true);
    const { error } = await supabase
      .from("list_items")
      .upsert({ list_id: listId, place_id: selectedPlace.id }, { onConflict: "list_id,place_id" });
    setAddingToList(false);
    setAddToListMessage(error ? "Nepovedlo se přidat." : "Přidáno do seznamu.");
  }

  async function createListAndAdd() {
    if (!newListName.trim() || !selectedPlace) return;
    setAddingToList(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: newList, error } = await supabase
        .from("lists")
        .insert({ owner_id: user.id, name: newListName.trim() })
        .select()
        .single();

      if (!error && newList) {
        await supabase.from("list_items").insert({ list_id: newList.id, place_id: selectedPlace.id });
        setNewListName("");
        await loadLists();
        setAddToListMessage(`Přidáno do "${newList.name}".`);
      }
    }
    setAddingToList(false);
  }

  const loadPlaces = useCallback(async () => {
    const { data, error } = await supabase
      .from("places_with_ratings")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setPlaces(data as Place[]);
      placesRef.current = data as Place[];
    }
  }, [supabase]);

  // Initialize the map once.
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: [
              "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
              "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
              "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
            ],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors © CARTO",
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
      center: [BRNO.lng, BRNO.lat],
      zoom: 12,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("click", (e) => {
      setSelectedPlace(null);
      setDraft({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      setDraftType("custom");
      setDraftName("");
      setDraftNote("");
    });

    // Track the user's live position with a "you are here" marker, and
    // recenter the map on it once as soon as we get the first fix.
    let hasCenteredOnUser = false;
    if (navigator.geolocation) {
      geoWatchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          userPositionRef.current = point;

          if (!userMarkerRef.current) {
            const el = document.createElement("div");
            el.style.width = "18px";
            el.style.height = "18px";
            el.style.borderRadius = "50%";
            el.style.background = "#4C7A8C";
            el.style.border = "3px solid white";
            el.style.boxShadow = "0 0 0 4px rgba(76,122,140,0.25), 0 1px 4px rgba(0,0,0,0.4)";
            userMarkerRef.current = new maplibregl.Marker({ element: el })
              .setLngLat([point.lng, point.lat])
              .addTo(map);
          } else {
            userMarkerRef.current.setLngLat([point.lng, point.lat]);
          }

          if (!hasCenteredOnUser) {
            hasCenteredOnUser = true;
            map.setCenter([point.lng, point.lat]);
          }
        },
        () => {
          /* fall back silently to Brno if permission is denied */
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 8000 }
      );
    }

    const maybeAutoFetchWater = () => {
      setZoom(map.getZoom());
      if (map.getZoom() < MIN_AUTO_FETCH_ZOOM) return;

      const bounds = map.getBounds();
      const last = lastFetchBoundsRef.current;
      // Skip if the current view is already fully covered by the last fetch.
      if (last && last.contains(bounds.getNorthWest()) && last.contains(bounds.getSouthEast())) {
        return;
      }

      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = setTimeout(() => {
        runWaterImportRef.current(true);
      }, 800);
    };

    map.on("moveend", maybeAutoFetchWater);
    map.on("load", maybeAutoFetchWater);

    mapRef.current = map;
    loadPlaces();

    return () => {
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
      if (geoWatchIdRef.current !== null) {
        navigator.geolocation?.clearWatch(geoWatchIdRef.current);
      }
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep markers in sync with `places`.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const seen = new Set<string>();

    for (const place of places) {
      seen.add(place.id);
      const meta = PLACE_TYPE_META[place.type];
      let marker = markersRef.current.get(place.id);

      if (!marker) {
        const el = document.createElement("button");
        el.style.width = "16px";
        el.style.height = "16px";
        el.style.borderRadius = "50%";
        el.style.border = "2px solid white";
        el.style.boxShadow = "0 1px 3px rgba(0,0,0,0.4)";
        el.style.cursor = "pointer";
        el.style.background = meta.markerColor;
        el.onclick = (ev) => {
          ev.stopPropagation();
          setDraft(null);
          setSelectedPlace(place);
        };

        marker = new maplibregl.Marker({ element: el })
          .setLngLat([place.lng, place.lat])
          .addTo(map);
        markersRef.current.set(place.id, marker);
      }
    }

    for (const [id, marker] of markersRef.current.entries()) {
      if (!seen.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }
  }, [places]);

  useEffect(() => {
    if (selectedPlace) {
      setAddToListMessage(null);
      setNewListName("");
      loadLists();
    }
  }, [selectedPlace, loadLists]);

  async function savePlace() {
    if (!draft || !draftName.trim()) return;
    setSaving(true);

    const { error } = await supabase.rpc("insert_place", {
      p_type: draftType,
      p_name: draftName.trim(),
      p_description: draftNote.trim() || null,
      p_lat: draft.lat,
      p_lng: draft.lng,
      p_source: "user",
      p_osm_id: null,
    });

    setSaving(false);
    if (!error) {
      setDraft(null);
      loadPlaces();
    }
  }

  async function ratePlace(score: number) {
    if (!selectedPlace) return;
    const { error } = await supabase.rpc("rate_place", {
      p_place_id: selectedPlace.id,
      p_score: score,
      p_comment: null,
    });
    if (!error) {
      loadPlaces();
      setSelectedPlace(null);
    }
  }

  const runWaterImport = useCallback(
    async (silent: boolean) => {
      const map = mapRef.current;
      if (!map) return;

      const now = Date.now();
      if (silent && now - lastFetchTimeRef.current < MIN_MS_BETWEEN_FETCHES) {
        // Too soon since the last automatic fetch — skip quietly.
        return;
      }

      setImporting(true);
      if (!silent) setImportMessage(null);

      try {
        const bounds = map.getBounds();
        const points = await fetchDrinkingWater({
          south: bounds.getSouth(),
          west: bounds.getWest(),
          north: bounds.getNorth(),
          east: bounds.getEast(),
        });

        const existingOsmIds = new Set(
          placesRef.current.map((p) => p.osm_id).filter(Boolean)
        );
        const newPoints = points.filter((p) => !existingOsmIds.has(p.osmId));

        for (const point of newPoints) {
          await supabase.rpc("insert_place", {
            p_type: "water",
            p_name: point.name,
            p_description: null,
            p_lat: point.lat,
            p_lng: point.lng,
            p_source: "osm",
            p_osm_id: point.osmId,
          });
        }

        lastFetchBoundsRef.current = bounds;
        lastFetchTimeRef.current = now;

        if (newPoints.length > 0) {
          await loadPlaces();
        }

        if (!silent) {
          setImportMessage(
            newPoints.length > 0
              ? `Přidáno ${newPoints.length} nových zdrojů vody.`
              : "V tomto výřezu už nic nového není."
          );
        }
      } catch {
        if (!silent) {
          setImportMessage(
            "Zdroj OpenStreetMap dat je teď nedostupný nebo přetížený. Zkus to prosím za chvíli."
          );
        }
      } finally {
        setImporting(false);
      }
    },
    [loadPlaces, supabase]
  );

  // Keep a ref to the latest import function so the map's event listeners
  // (registered once, on mount) always call the current version.
  const runWaterImportRef = useRef(runWaterImport);
  useEffect(() => {
    runWaterImportRef.current = runWaterImport;
  }, [runWaterImport]);

  function flyToUser() {
    const map = mapRef.current;
    const pos = userPositionRef.current;
    if (!map || !pos) return;
    map.flyTo({ center: [pos.lng, pos.lat], zoom: Math.max(map.getZoom(), 14) });
  }

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="h-full w-full" />

      <button
        onClick={flyToUser}
        title="Moje poloha"
        className="absolute right-5 top-[88px] flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white shadow-sm transition hover:bg-paper"
      >
        <span className="block h-2.5 w-2.5 rounded-full border-2 border-white bg-sky shadow-[0_0_0_2px_rgba(76,122,140,0.4)]" />
      </button>


      {/* Legend */}
      <div className="pointer-events-none absolute bottom-5 left-5 rounded-lg border border-line bg-white/90 px-3 py-2 text-xs shadow-sm backdrop-blur">
        {Object.entries(PLACE_TYPE_META).map(([key, meta]) => (
          <div key={key} className="flex items-center gap-2 py-0.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full border border-white"
              style={{ background: meta.markerColor }}
            />
            <span className="text-ink/70">{meta.label}</span>
          </div>
        ))}
      </div>

      {/* Import drinking water */}
      <div className="absolute bottom-5 right-5 flex flex-col items-end gap-2">
        {importMessage && (
          <p className="max-w-[220px] rounded-lg border border-line bg-white/90 px-3 py-1.5 text-right text-xs text-ink/70 shadow-sm">
            {importMessage}
          </p>
        )}
        {zoom < MIN_AUTO_FETCH_ZOOM && (
          <p className="max-w-[220px] rounded-lg border border-line bg-white/90 px-3 py-1.5 text-right text-xs text-ink/50 shadow-sm">
            Přibliž mapu pro automatické načtení vody v okolí.
          </p>
        )}
        <button
          onClick={() => runWaterImport(false)}
          disabled={importing}
          className="rounded-lg bg-sky px-4 py-2 text-sm font-medium text-paper shadow-sm transition hover:bg-sky/90 disabled:opacity-60"
        >
          {importing ? "Hledám vodu…" : "Obnovit vodu v okolí"}
        </button>
      </div>

      {/* New place panel */}
      {draft && (
        <div className="absolute right-5 top-5 w-72 rounded-xl border border-line bg-white/95 p-4 shadow-md backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium text-ink">Nové místo</h2>
            <button onClick={() => setDraft(null)} className="text-ink/40 hover:text-ink">
              ✕
            </button>
          </div>
          <p className="mb-3 font-mono text-xs text-ink/40">
            {draft.lat.toFixed(5)}, {draft.lng.toFixed(5)}
          </p>

          <label className="mb-1 block text-xs text-ink/60">Typ</label>
          <select
            value={draftType}
            onChange={(e) => setDraftType(e.target.value as PlaceType)}
            className="mb-3 w-full rounded-lg border border-line bg-white px-2 py-1.5 text-sm"
          >
            {Object.entries(PLACE_TYPE_META).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
          </select>

          <label className="mb-1 block text-xs text-ink/60">Název</label>
          <input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder="např. Studánka pod vrcholem"
            className="mb-3 w-full rounded-lg border border-line bg-white px-2 py-1.5 text-sm"
          />

          <label className="mb-1 block text-xs text-ink/60">Poznámka (volitelné)</label>
          <textarea
            value={draftNote}
            onChange={(e) => setDraftNote(e.target.value)}
            rows={2}
            className="mb-4 w-full rounded-lg border border-line bg-white px-2 py-1.5 text-sm"
          />

          <button
            onClick={savePlace}
            disabled={saving || !draftName.trim()}
            className="w-full rounded-lg bg-moss py-2 text-sm font-medium text-paper transition hover:bg-moss-light disabled:opacity-60"
          >
            {saving ? "Ukládám…" : "Uložit místo"}
          </button>
        </div>
      )}

      {/* Place detail / rating panel */}
      {selectedPlace && (
        <div className="absolute right-5 top-5 w-72 rounded-xl border border-line bg-white/95 p-4 shadow-md backdrop-blur">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="font-medium text-ink">{selectedPlace.name}</h2>
            <button onClick={() => setSelectedPlace(null)} className="text-ink/40 hover:text-ink">
              ✕
            </button>
          </div>
          <p className={`mb-2 text-xs ${PLACE_TYPE_META[selectedPlace.type].color}`}>
            {PLACE_TYPE_META[selectedPlace.type].label}
            {selectedPlace.source === "osm" && " · OpenStreetMap"}
          </p>
          {selectedPlace.description && (
            <p className="mb-3 text-sm text-ink/70">{selectedPlace.description}</p>
          )}

          <p className="mb-1 text-xs text-ink/60">
            {selectedPlace.avg_rating
              ? `Hodnocení: ${selectedPlace.avg_rating} / 5 (${selectedPlace.rating_count})`
              : "Zatím bez hodnocení"}
          </p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => ratePlace(n)}
                className="text-2xl leading-none text-gold transition hover:scale-110"
                aria-label={`Ohodnotit ${n} z 5`}
              >
                {n <= (selectedPlace.avg_rating ?? 0) ? "★" : "☆"}
              </button>
            ))}
          </div>

          <div className="mt-4 border-t border-line pt-3">
            <p className="mb-2 text-xs text-ink/60">Přidat do seznamu</p>
            <div className="flex flex-wrap gap-1.5">
              {userLists.map((list) => (
                <button
                  key={list.id}
                  onClick={() => addPlaceToList(list.id)}
                  disabled={addingToList}
                  className="rounded-full border border-line bg-white px-2.5 py-1 text-xs text-ink/70 transition hover:border-moss hover:text-moss disabled:opacity-60"
                >
                  {list.name}
                </button>
              ))}
            </div>
            <div className="mt-2 flex gap-1.5">
              <input
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="nový seznam…"
                className="flex-1 rounded-lg border border-line bg-white px-2 py-1.5 text-xs"
              />
              <button
                onClick={createListAndAdd}
                disabled={addingToList || !newListName.trim()}
                className="rounded-lg bg-moss px-2.5 py-1.5 text-xs font-medium text-paper transition hover:bg-moss-light disabled:opacity-60"
              >
                +
              </button>
            </div>
            {addToListMessage && (
              <p className="mt-2 text-xs text-moss">{addToListMessage}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
