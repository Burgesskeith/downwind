import type { GeocodeResult } from "@workspace/api-client-react";

const OPEN_METEO_GEOCODE = "https://geocoding-api.open-meteo.com/v1/search";

const geocodeCache = new Map<string, GeocodeResult>();

/** Call Open-Meteo directly — avoids routing search through the dev API server on native. */
export async function geocodeFromOpenMeteo(
  query: string,
  signal?: AbortSignal,
): Promise<GeocodeResult> {
  const cacheKey = query.toLowerCase().trim();
  const cached = geocodeCache.get(cacheKey);
  if (cached) return cached;

  const url = new URL(OPEN_METEO_GEOCODE);
  url.searchParams.set("name", query);
  url.searchParams.set("count", "5");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const resp = await fetch(url.toString(), {
    signal: signal ?? AbortSignal.timeout(8_000),
  });

  if (!resp.ok) {
    throw new Error("Failed to geocode location");
  }

  const data = (await resp.json()) as {
    results?: Array<{
      name: string;
      latitude: number;
      longitude: number;
      country?: string;
      admin1?: string;
    }>;
  };

  const result: GeocodeResult = {
    results: (data.results ?? []).map((r) => ({
      name: r.name,
      lat: r.latitude,
      lon: r.longitude,
      country: r.country,
      admin1: r.admin1,
    })),
  };

  geocodeCache.set(cacheKey, result);
  return result;
}
