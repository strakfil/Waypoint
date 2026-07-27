export interface OsmWaterPoint {
  osmId: string;
  lat: number;
  lng: number;
  name: string;
}

/**
 * Queries the OpenStreetMap Overpass API for drinking water points
 * (amenity=drinking_water) inside the given bounding box.
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

  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: query,
  });

  if (!response.ok) {
    throw new Error(`Overpass API selhalo (${response.status})`);
  }

  const data = await response.json();

  return (data.elements ?? []).map((el: { id: number; lat: number; lon: number; tags?: Record<string, string> }) => ({
    osmId: `osm:node:${el.id}`,
    lat: el.lat,
    lng: el.lon,
    name: el.tags?.name || "Pitná voda",
  }));
}
