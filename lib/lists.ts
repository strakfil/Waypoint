import type { PlaceType } from "./places";

export interface ListSummary {
  id: string;
  owner_id: string;
  name: string;
  is_public: boolean;
  created_at: string;
  item_count: number;
}

export interface ListItem {
  list_id: string;
  place_id: string;
  note: string | null;
  added_at: string;
  name: string;
  type: PlaceType;
  description: string | null;
  lat: number;
  lng: number;
  source: "user" | "osm";
  osm_id: string | null;
}
