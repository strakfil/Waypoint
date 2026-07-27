export type PlaceType =
  | "water"
  | "sleep_spot"
  | "via_ferrata"
  | "hiking"
  | "custom";

export const PLACE_TYPE_META: Record<
  PlaceType,
  { label: string; color: string; markerColor: string }
> = {
  water: { label: "Pitná voda", color: "text-sky", markerColor: "#4C7A8C" },
  sleep_spot: { label: "Místo na spaní", color: "text-trail", markerColor: "#8A7C5A" },
  via_ferrata: { label: "Ferrata", color: "text-gold", markerColor: "#C99A3D" },
  hiking: { label: "Hiking", color: "text-moss", markerColor: "#445D48" },
  custom: { label: "Vlastní", color: "text-ink", markerColor: "#16241E" },
};

export interface Place {
  id: string;
  owner_id: string | null;
  type: PlaceType;
  name: string;
  description: string | null;
  lat: number;
  lng: number;
  source: "user" | "osm";
  osm_id: string | null;
  created_at: string;
  avg_rating?: number | null;
  rating_count?: number;
}
