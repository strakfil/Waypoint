export interface OsmWaterPoint {
  osmId: string;
  lat: number;
  lng: number;
  name: string;
}

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
];

/**
 * Queries the OpenStreetMap Overpass API for drinking water points
 * (amenity=drinking_water) inside the given bounding box.
 * Tries a few public mirrors in turn, since any single one may
 * rate-limit or block a given origin.
 */
export async function fetchDrinkingWater(bbox: {
  south: number;
  west: number;
  north: number;
  east: number;
}): Promise<OsmWaterPoint[]> {
  const query = `
    [out:json][timeout:25];
    node["amenity"="drinking_water"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
    out body;
  `;

  let lastError: unknown = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: query,
      });

      if (!response.ok) {
        lastError = new Error(`Overpass API selhalo (${response.status}) na ${endpoint}`);
        continue;
      }

      const data = await response.json();

      return (data.elements ?? []).map(
        (el: { id: number; lat: number; lon: number; tags?: Record<string, string> }) => ({
          osmId: `osm:node:${el.id}`,
          lat: el.lat,
          lng: el.lon,
          name: el.tags?.name || "Pitná voda",
        })
      );
    } catch (err) {
      lastError = err;
      // try the next mirror
    }
  }

  throw lastError ?? new Error("Všechna Overpass zrcadla selhala.");
}
