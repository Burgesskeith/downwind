import { Router, type IRouter, type Request, type Response } from "express";
import { GetWeatherForecastQueryParams, GetWeatherForecastResponse, GeocodeLocationQueryParams, GeocodeLocationResponse } from "@workspace/api-zod";

const router: IRouter = Router();

function degToCompass(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = Math.round(deg / 22.5) % 16;
  return dirs[index];
}

function angleDiff(a: number, b: number): number {
  let diff = Math.abs(a - b) % 360;
  if (diff > 180) diff = 360 - diff;
  return diff;
}

/**
 * Probe 8 cardinal/intercardinal directions around a point to find which ones
 * are ocean (marine API returns data) vs land. The shoreline runs roughly
 * perpendicular to the primary ocean-facing direction.
 */
async function detectShorelineDirection(lat: number, lon: number): Promise<number | undefined> {
  const offset = 0.12; // ~13km
  const probes = [
    { deg: 0,   dlat:  offset, dlon:  0 },
    { deg: 45,  dlat:  offset, dlon:  offset },
    { deg: 90,  dlat:  0,      dlon:  offset },
    { deg: 135, dlat: -offset, dlon:  offset },
    { deg: 180, dlat: -offset, dlon:  0 },
    { deg: 225, dlat: -offset, dlon: -offset },
    { deg: 270, dlat:  0,      dlon: -offset },
    { deg: 315, dlat:  offset, dlon: -offset },
  ];

  const results = await Promise.allSettled(
    probes.map(async (p) => {
      const url = new URL("https://marine-api.open-meteo.com/v1/marine");
      url.searchParams.set("latitude", String(lat + p.dlat));
      url.searchParams.set("longitude", String(lon + p.dlon));
      url.searchParams.set("daily", "wave_height_max");
      url.searchParams.set("forecast_days", "1");
      const resp = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
      const data = await resp.json() as { error?: string; daily?: { wave_height_max: (number | null)[] } };
      const isOcean = resp.ok && !data.error && Array.isArray(data.daily?.wave_height_max) && data.daily!.wave_height_max.length > 0;
      return { deg: p.deg, isOcean };
    })
  );

  const oceanDirs: number[] = [];
  for (const r of results) {
    if (r.status === "fulfilled" && r.value.isOcean) {
      oceanDirs.push(r.value.deg);
    }
  }

  if (oceanDirs.length === 0) return undefined;

  // Average the ocean-facing vectors
  let x = 0;
  let y = 0;
  for (const deg of oceanDirs) {
    const rad = (deg * Math.PI) / 180;
    x += Math.cos(rad);
    y += Math.sin(rad);
  }
  const avgOceanDeg = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;

  // Shoreline runs perpendicular to the primary ocean direction
  return (avgOceanDeg + 90) % 360;
}

function scorePaddlingDay(params: {
  windSpeed: number;
  windDirection: number;
  swellHeight: number;
  swellPeriod: number;
  swellDirection: number;
  shorelineDirection?: number;
}): { score: number; summary: string; conditionLabel: string; alignmentAngle: number } {
  const { windSpeed, windDirection, swellHeight, swellPeriod, swellDirection, shorelineDirection } = params;

  const alignmentAngle = angleDiff(windDirection, swellDirection);
  const opposing = alignmentAngle > 120;

  // --- Wind/Swell alignment score (max 4 pts, penalty if opposing) ---
  let alignmentScore = 0;
  if (alignmentAngle <= 20) alignmentScore = 4;
  else if (alignmentAngle <= 45) alignmentScore = 3;
  else if (alignmentAngle <= 70) alignmentScore = 2;
  else if (alignmentAngle <= 90) alignmentScore = 1;
  else if (alignmentAngle <= 120) alignmentScore = 0;
  else alignmentScore = -2; // opposing wind fights the swell

  // --- Swell height score: ideal 0.5-2.5m (max 2.5 pts) ---
  let swellScore = 0;
  if (swellHeight >= 0.5 && swellHeight <= 1.5) swellScore = 2.5;
  else if (swellHeight > 1.5 && swellHeight <= 2.5) swellScore = 2.0;
  else if (swellHeight > 2.5 && swellHeight <= 3.5) swellScore = 1.0;
  else if (swellHeight > 0.2 && swellHeight < 0.5) swellScore = 1.0;
  else if (swellHeight > 3.5) swellScore = 0.5;
  else swellScore = 0;

  // --- Swell period score: ideal 10-18s (max 2 pts) ---
  let periodScore = 0;
  if (swellPeriod >= 12 && swellPeriod <= 18) periodScore = 2;
  else if (swellPeriod >= 10 && swellPeriod < 12) periodScore = 1.5;
  else if (swellPeriod >= 8 && swellPeriod < 10) periodScore = 1;
  else if (swellPeriod >= 6 && swellPeriod < 8) periodScore = 0.5;
  else periodScore = 0;

  // --- Wind speed score: ideal 15-25 km/h (max 1.5 pts) ---
  let windScore = 0;
  if (windSpeed >= 15 && windSpeed <= 25) windScore = 1.5;
  else if (windSpeed > 25 && windSpeed <= 35) windScore = 1.0;
  else if (windSpeed > 10 && windSpeed < 15) windScore = 1.0;
  else if (windSpeed > 35 && windSpeed <= 45) windScore = 0.5;
  else if (windSpeed < 10) windScore = 0.5;
  else windScore = 0;

  // --- Shoreline alignment bonus: wind parallel to coast (max 1.5 pts) ---
  let shorelineBonus = 0;
  let shorelineAngle: number | null = null;
  if (shorelineDirection !== undefined && shorelineDirection !== null) {
    const diff1 = angleDiff(windDirection, shorelineDirection);
    const diff2 = angleDiff(windDirection, (shorelineDirection + 180) % 360);
    shorelineAngle = Math.min(diff1, diff2);
    if (shorelineAngle <= 20) shorelineBonus = 1.5;
    else if (shorelineAngle <= 35) shorelineBonus = 1.2;
    else if (shorelineAngle <= 50) shorelineBonus = 0.8;
    else if (shorelineAngle <= 70) shorelineBonus = 0.4;
    else shorelineBonus = 0;
  }

  let score = alignmentScore + swellScore + periodScore + windScore + shorelineBonus;

  // Hard cap for opposing conditions — it is nearly impossible to paddle
  // into wind that opposes the swell; both forces work against the paddler.
  if (opposing) {
    score = Math.min(score, 3.5);
  }

  score = Math.min(10, Math.max(1, Math.round(score * 10) / 10));

  let conditionLabel: string;
  if (score >= 8) conditionLabel = "Epic";
  else if (score >= 6) conditionLabel = "Good";
  else if (score >= 4) conditionLabel = "Fair";
  else conditionLabel = "Poor";

  const windDirLabel = degToCompass(windDirection);
  const swellDirLabel = degToCompass(swellDirection);

  let summary = "";

  if (opposing) {
    summary += `⚠️ Wind (${windDirLabel}) and swell (${swellDirLabel}) are opposing at ${Math.round(alignmentAngle)}° — you'd be paddling into the wind against the swell, making this nearly unrunnable. `;
  } else if (alignmentAngle <= 30) {
    summary += `Wind and swell are well-aligned (${Math.round(alignmentAngle)}° offset), creating ideal downwind running conditions. `;
  } else if (alignmentAngle <= 60) {
    summary += `Wind and swell have a moderate ${Math.round(alignmentAngle)}° offset — still rideable but expect some cross chop. `;
  } else {
    summary += `Wind and swell are off-axis at ${Math.round(alignmentAngle)}°, creating confused seas — harder but not impossible. `;
  }

  if (swellHeight < 0.3) {
    summary += `Swell is very small at ${swellHeight.toFixed(1)}m — not enough energy to surf. `;
  } else if (swellHeight <= 1.5) {
    summary += `Swell is a fun ${swellHeight.toFixed(1)}m from the ${swellDirLabel}, great for catching runs. `;
  } else if (swellHeight <= 2.5) {
    summary += `${swellHeight.toFixed(1)}m swell from the ${swellDirLabel} offers plenty of energy. `;
  } else {
    summary += `Large ${swellHeight.toFixed(1)}m swell from the ${swellDirLabel} — powerful but demanding. `;
  }

  if (swellPeriod >= 12) {
    summary += `Long ${Math.round(swellPeriod)}s period gives well-organised, powerful waves. `;
  } else if (swellPeriod >= 8) {
    summary += `${Math.round(swellPeriod)}s period provides moderate energy. `;
  } else {
    summary += `Short ${Math.round(swellPeriod)}s period means choppy, wind-driven seas. `;
  }

  if (windSpeed >= 15 && windSpeed <= 30) {
    summary += `Wind at ${Math.round(windSpeed)} km/h from the ${windDirLabel} is in the sweet spot for downwind paddling.`;
  } else if (windSpeed > 30) {
    summary += `${Math.round(windSpeed)} km/h ${windDirLabel} wind is strong — experienced paddlers only.`;
  } else {
    summary += `Light ${Math.round(windSpeed)} km/h ${windDirLabel} wind means you'll need to work harder without much push.`;
  }

  // Shoreline bonus note
  if (shorelineDirection !== undefined && shorelineAngle !== null) {
    const shoreDirLabel = degToCompass(shorelineDirection);
    if (shorelineBonus >= 1.2) {
      summary += ` The ${windDirLabel} wind runs parallel to the ${shoreDirLabel} shoreline — ideal for a long downwind run (+${shorelineBonus.toFixed(1)} bonus).`;
    } else if (shorelineBonus >= 0.4) {
      summary += ` Wind has some alignment with the ${shoreDirLabel} coast (+${shorelineBonus.toFixed(1)} bonus).`;
    } else if (shorelineDirection !== undefined) {
      summary += ` Wind doesn't favour the ${shoreDirLabel} shoreline run today.`;
    }
  }

  return { score, summary, conditionLabel, alignmentAngle: Math.round(alignmentAngle) };
}

function getDayLabel(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00Z");
  const today = new Date();
  today.setUTCHours(12, 0, 0, 0);
  const diff = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return date.toLocaleDateString("en-AU", { weekday: "long", timeZone: "UTC" });
}

router.get("/forecast", async (req: Request, res: Response) => {
  const parseResult = GetWeatherForecastQueryParams.safeParse({
    lat: req.query.lat ? Number(req.query.lat) : undefined,
    lon: req.query.lon ? Number(req.query.lon) : undefined,
    locationName: req.query.locationName,
    paddlingDirection: req.query.paddlingDirection ? Number(req.query.paddlingDirection) : undefined,
  });

  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid parameters. Provide lat and lon as numbers." });
    return;
  }

  const { lat, lon, locationName } = parseResult.data;
  // Use supplied paddling direction, or auto-detect from coastline
  let shorelineDirection: number | undefined = parseResult.data.paddlingDirection;

  try {
    const url = new URL("https://marine-api.open-meteo.com/v1/marine");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lon));
    url.searchParams.set("daily", [
      "wave_height_max",
      "wave_period_max",
      "wave_direction_dominant",
      "swell_wave_height_max",
      "swell_wave_period_max",
      "swell_wave_direction_dominant",
    ].join(","));

    const windUrl = new URL("https://api.open-meteo.com/v1/forecast");
    windUrl.searchParams.set("latitude", String(lat));
    windUrl.searchParams.set("longitude", String(lon));
    windUrl.searchParams.set("daily", ["wind_speed_10m_max", "wind_direction_10m_dominant"].join(","));
    windUrl.searchParams.set("wind_speed_unit", "kmh");
    windUrl.searchParams.set("timezone", "auto");
    windUrl.searchParams.set("forecast_days", "7");

    // Run marine, wind, and shoreline detection in parallel
    const [marineResp, windResp, detectedShoreline] = await Promise.all([
      fetch(url.toString()),
      fetch(windUrl.toString()),
      shorelineDirection === undefined ? detectShorelineDirection(lat, lon) : Promise.resolve(undefined),
    ]);

    if (shorelineDirection === undefined && detectedShoreline !== undefined) {
      shorelineDirection = detectedShoreline;
    }

    if (!marineResp.ok) {
      req.log.error({ status: marineResp.status }, "Marine API error");
      res.status(500).json({ error: "Failed to fetch marine data" });
      return;
    }
    if (!windResp.ok) {
      req.log.error({ status: windResp.status }, "Wind API error");
      res.status(500).json({ error: "Failed to fetch wind data" });
      return;
    }

    const marineData = await marineResp.json() as {
      daily: {
        time: string[];
        swell_wave_height_max: (number | null)[];
        swell_wave_period_max: (number | null)[];
        swell_wave_direction_dominant: (number | null)[];
        wave_height_max: (number | null)[];
        wave_period_max: (number | null)[];
        wave_direction_dominant: (number | null)[];
      };
    };
    const windData = await windResp.json() as {
      daily: {
        time: string[];
        wind_speed_10m_max: (number | null)[];
        wind_direction_10m_dominant: (number | null)[];
      };
    };

    const dates = marineData.daily.time;

    const days = dates.slice(0, 7).map((date, i) => {
      const swellHeight = marineData.daily.swell_wave_height_max[i] ?? marineData.daily.wave_height_max[i] ?? 0;
      const swellPeriod = marineData.daily.swell_wave_period_max[i] ?? marineData.daily.wave_period_max[i] ?? 6;
      const swellDirection = marineData.daily.swell_wave_direction_dominant[i] ?? marineData.daily.wave_direction_dominant[i] ?? 0;
      const windSpeed = windData.daily.wind_speed_10m_max[i] ?? 0;
      const windDirection = windData.daily.wind_direction_10m_dominant[i] ?? 0;

      const { score, summary, conditionLabel, alignmentAngle } = scorePaddlingDay({
        windSpeed,
        windDirection,
        swellHeight,
        swellPeriod,
        swellDirection,
        shorelineDirection,
      });

      return {
        date,
        dayLabel: getDayLabel(date),
        score,
        windSpeed: Math.round(windSpeed * 10) / 10,
        windDirection: Math.round(windDirection),
        windDirectionLabel: degToCompass(windDirection),
        swellHeight: Math.round(swellHeight * 100) / 100,
        swellPeriod: Math.round(swellPeriod * 10) / 10,
        swellDirection: Math.round(swellDirection),
        swellDirectionLabel: degToCompass(swellDirection),
        alignmentAngle,
        summary,
        conditionLabel,
      };
    });

    const forecast = GetWeatherForecastResponse.parse({
      locationName: locationName ?? `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
      lat,
      lon,
      days,
    });

    res.json(forecast);
  } catch (err) {
    req.log.error({ err }, "Error fetching weather forecast");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/geocode", async (req: Request, res: Response) => {
  const parseResult = GeocodeLocationQueryParams.safeParse({
    query: req.query.query,
  });

  if (!parseResult.success) {
    res.status(400).json({ error: "Missing query parameter" });
    return;
  }

  const { query } = parseResult.data;

  try {
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.searchParams.set("name", query);
    url.searchParams.set("count", "5");
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");

    const resp = await fetch(url.toString());
    if (!resp.ok) {
      req.log.error({ status: resp.status }, "Geocoding API error");
      res.status(500).json({ error: "Failed to geocode location" });
      return;
    }

    const data = await resp.json() as {
      results?: Array<{
        name: string;
        latitude: number;
        longitude: number;
        country?: string;
        admin1?: string;
      }>;
    };

    const results = (data.results ?? []).map((r) => ({
      name: r.name,
      lat: r.latitude,
      lon: r.longitude,
      country: r.country,
      admin1: r.admin1,
    }));

    const geocodeResponse = GeocodeLocationResponse.parse({ results });
    res.json(geocodeResponse);
  } catch (err) {
    req.log.error({ err }, "Error geocoding location");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
