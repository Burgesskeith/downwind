import type { GeocodeLocation, GeocodeResult } from "@workspace/api-client-react";
import { normalizeLocationName } from "@/lib/utils";

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
      name: normalizeLocationName(r.name),
      lat: r.latitude,
      lon: r.longitude,
      country: r.country,
      admin1: r.admin1,
    })),
  };

  geocodeCache.set(cacheKey, result);
  return result;
}

function locationNeedsRegion(location: GeocodeLocation): boolean {
  return !location.country || !location.admin1;
}

/** Pick the geocode hit closest to a known lat/lon (saved prefs often lack region fields). */
export function findBestGeocodeMatch(
  target: { lat: number; lon: number },
  results: GeocodeLocation[],
): GeocodeLocation | undefined {
  if (results.length === 0) return undefined;

  let best = results[0];
  let bestDistance = Infinity;

  for (const candidate of results) {
    const dLat = target.lat - candidate.lat;
    const dLon = target.lon - candidate.lon;
    const distance = dLat * dLat + dLon * dLon;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }

  return best;
}

/** Fill in admin1/country when missing — common for locations saved before those fields were stored. */
export async function enrichGeocodeLocation(
  location: GeocodeLocation,
  signal?: AbortSignal,
): Promise<GeocodeLocation> {
  const normalized = {
    ...location,
    name: normalizeLocationName(location.name),
  };

  if (!locationNeedsRegion(normalized)) return normalized;

  try {
    const { results } = await geocodeFromOpenMeteo(normalized.name, signal);
    const match = findBestGeocodeMatch(normalized, results);
    if (!match) return normalized;

    return {
      ...normalized,
      country: normalized.country ?? match.country,
      admin1: normalized.admin1 ?? match.admin1,
    };
  } catch {
    return normalized;
  }
}
