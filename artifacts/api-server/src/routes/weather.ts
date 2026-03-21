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
  windSpeed: number;       // km/h
  windDirection: number;   // degrees meteorological
  swellHeight: number;     // metres
  swellPeriod: number;     // seconds
  swellDirection: number;  // degrees
  shorelineDirection?: number;
}): { score: number; summary: string; conditionLabel: string; alignmentAngle: number } {
  const { windSpeed, windDirection, swellHeight, swellPeriod, swellDirection, shorelineDirection } = params;

  const alignmentAngle = angleDiff(windDirection, swellDirection);
  const opposing = alignmentAngle > 120;

  // ─── Wind / Swell alignment (max 3.5 pts) ───────────────────────────────
  // Best: same direction. Avoid cross (messy) and opposing (kills glide).
  let alignmentScore: number;
  if      (alignmentAngle <= 20)  alignmentScore =  3.5;  // perfectly aligned
  else if (alignmentAngle <= 45)  alignmentScore =  2.5;  // good
  else if (alignmentAngle <= 70)  alignmentScore =  1.5;  // acceptable cross
  else if (alignmentAngle <= 90)  alignmentScore =  0.5;  // messy cross
  else if (alignmentAngle <= 120) alignmentScore = -0.5;  // confused seas
  else                            alignmentScore = -2.0;  // opposing — kills glide

  // ─── Wind speed (max 2.5 pts) ────────────────────────────────────────────
  // 15–25 knots (28–46 km/h) is the core sweet spot.
  // 10–15 knots (19–28 km/h): beginner-friendly.
  // 25–30 knots (46–56 km/h): advanced/powerful runs.
  // >35 knots (>65 km/h): dangerous.
  let windScore: number;
  if      (windSpeed >= 28 && windSpeed <= 46) windScore = 2.5;  // 15–25 kn ideal
  else if (windSpeed >  46 && windSpeed <= 56) windScore = 2.0;  // 25–30 kn advanced
  else if (windSpeed >  19 && windSpeed <  28) windScore = 1.5;  // 10–15 kn beginner
  else if (windSpeed >  56 && windSpeed <= 65) windScore = 1.0;  // 30–35 kn strong
  else if (windSpeed >  10 && windSpeed <= 19) windScore = 0.5;  // 5–10 kn very light
  else if (windSpeed >  65)                    windScore = 0.0;  // >35 kn dangerous
  else                                         windScore = 0.0;  // <5 kn — flat, no push

  // ─── Swell height (max 2.5 pts) ──────────────────────────────────────────
  // Ideal: 1–2.5 m. Too small → no energy; too large → survival paddling.
  let swellScore: number;
  if      (swellHeight >= 1.0 && swellHeight <= 2.5) swellScore = 2.5;  // ideal
  else if (swellHeight >  2.5 && swellHeight <= 3.5) swellScore = 1.5;  // large, demanding
  else if (swellHeight >= 0.5 && swellHeight <  1.0) swellScore = 1.5;  // small, still fun
  else if (swellHeight >  3.5)                       swellScore = 0.5;  // extreme
  else if (swellHeight >= 0.2 && swellHeight <  0.5) swellScore = 0.5;  // very small
  else                                               swellScore = 0.0;  // flat

  // ─── Swell period (max 2.0 pts) ──────────────────────────────────────────
  // 6–10 s wind swell creates the fast "bumps" and runners for downwind.
  // Longer ground swell is well-organised but bumps are far apart and harder
  // to link. Very short chop (<5 s) is disorganised and punishing.
  let periodScore: number;
  if      (swellPeriod >= 6  && swellPeriod <= 10) periodScore = 2.0;  // ideal wind swell
  else if (swellPeriod >  10 && swellPeriod <= 14) periodScore = 1.5;  // good ground swell
  else if (swellPeriod >  5  && swellPeriod <  6)  periodScore = 1.0;  // short but usable
  else if (swellPeriod >  14 && swellPeriod <= 18) periodScore = 1.0;  // long period, sparse
  else if (swellPeriod >  18)                      periodScore = 0.5;  // very long, hard to link
  else                                             periodScore = 0.0;  // <5 s — pure chop

  // ─── Shoreline alignment bonus (max 0.5 pts, penalty for offshore) ───────
  // Wind parallel to the coast = ideal downwind run.
  // Wind blowing offshore (perpendicular away from shore) = dangerous.
  let shorelineBonus = 0;
  let shorelineAngle: number | null = null;
  let isOffshore = false;
  if (shorelineDirection !== undefined && shorelineDirection !== null) {
    // Angle between wind and shore-parallel axis (bidirectional)
    const diff1 = angleDiff(windDirection, shorelineDirection);
    const diff2 = angleDiff(windDirection, (shorelineDirection + 180) % 360);
    shorelineAngle = Math.min(diff1, diff2);

    // Offshore = wind roughly perpendicular to shore (blowing away from coast)
    const offshoreAngle = Math.min(
      angleDiff(windDirection, (shorelineDirection + 90) % 360),
      angleDiff(windDirection, (shorelineDirection + 270) % 360)
    );
    isOffshore = offshoreAngle <= 35;

    if (isOffshore) {
      shorelineBonus = -1.0; // offshore wind — safety hazard
    } else if (shorelineAngle <= 25) {
      shorelineBonus = 0.5;  // wind running parallel to coast — ideal
    } else if (shorelineAngle <= 50) {
      shorelineBonus = 0.25; // slight angle
    } else {
      shorelineBonus = 0;
    }
  }

  // ─── Total ────────────────────────────────────────────────────────────────
  let score = alignmentScore + windScore + swellScore + periodScore + shorelineBonus;

  // Hard cap for opposing conditions — opposing wind kills all forward glide.
  if (opposing) score = Math.min(score, 3.5);

  score = Math.min(10, Math.max(1, Math.round(score * 10) / 10));

  // ─── Condition label ─────────────────────────────────────────────────────
  let conditionLabel: string;
  if      (score >= 8) conditionLabel = "Epic";
  else if (score >= 6) conditionLabel = "Good";
  else if (score >= 4) conditionLabel = "Fair";
  else                 conditionLabel = "Poor";

  // ─── Summary text ─────────────────────────────────────────────────────────
  const windDirLabel  = degToCompass(windDirection);
  const swellDirLabel = degToCompass(swellDirection);
  let summary = "";

  // Alignment
  if (opposing) {
    summary += `Wind (${windDirLabel}) and swell (${swellDirLabel}) are opposing at ${Math.round(alignmentAngle)}° — running into the wind against the swell makes this nearly unrunnable. `;
  } else if (alignmentAngle <= 25) {
    summary += `Wind and swell are well-aligned (${Math.round(alignmentAngle)}° offset) — classic downwind conditions with linked runners expected. `;
  } else if (alignmentAngle <= 55) {
    summary += `Wind and swell have a ${Math.round(alignmentAngle)}° offset — good runs are possible but expect some cross chop breaking up the lines. `;
  } else if (alignmentAngle <= 90) {
    summary += `Wind and swell are significantly cross at ${Math.round(alignmentAngle)}° — confused, messy conditions with disorganised bumps. `;
  } else {
    summary += `Wind and swell are badly off-axis at ${Math.round(alignmentAngle)}° — very confused seas, difficult to find linkable runners. `;
  }

  // Swell height + character (period indicates wind swell vs ground swell)
  const isWindSwell = swellPeriod >= 5 && swellPeriod <= 12;
  const swellType   = isWindSwell ? "wind swell" : "ground swell";
  if (swellHeight < 0.3) {
    summary += `Virtually flat at ${swellHeight.toFixed(1)}m — no energy to work with. `;
  } else if (swellHeight < 0.5) {
    summary += `Very small ${swellHeight.toFixed(1)}m ${swellType} — barely enough to catch. `;
  } else if (swellHeight < 1.0) {
    summary += `Small ${swellHeight.toFixed(1)}m ${swellType} from the ${swellDirLabel} — beginner-friendly bumps. `;
  } else if (swellHeight <= 2.5) {
    summary += `${swellHeight.toFixed(1)}m ${swellType} from the ${swellDirLabel} — ideal size for fast, linked runners. `;
  } else if (swellHeight <= 3.5) {
    summary += `Large ${swellHeight.toFixed(1)}m ${swellType} from the ${swellDirLabel} — powerful runs for advanced paddlers. `;
  } else {
    summary += `Extreme ${swellHeight.toFixed(1)}m swell from the ${swellDirLabel} — survival conditions, expert only. `;
  }

  // Period character
  if (swellPeriod < 5) {
    summary += `${Math.round(swellPeriod)}s period is pure choppy chop — very hard to link any runs. `;
  } else if (swellPeriod <= 10) {
    summary += `${Math.round(swellPeriod)}s period is the sweet spot for downwind — fast, frequent bumps with good linking potential. `;
  } else if (swellPeriod <= 14) {
    summary += `${Math.round(swellPeriod)}s period gives well-organised, powerful waves — great energy but bumps are more spread out. `;
  } else {
    summary += `Long ${Math.round(swellPeriod)}s period means sparse, powerful waves — expect gaps between runners. `;
  }

  // Wind speed + skill level guidance
  if (windSpeed < 10) {
    summary += `${Math.round(windSpeed)} km/h is barely a breeze — minimal push and no whitecaps.`;
  } else if (windSpeed < 19) {
    summary += `Light ${Math.round(windSpeed)} km/h (${Math.round(windSpeed / 1.852)} kn) ${windDirLabel} wind — light energy, suitable for technique work.`;
  } else if (windSpeed < 28) {
    summary += `${Math.round(windSpeed)} km/h (${Math.round(windSpeed / 1.852)} kn) ${windDirLabel} wind — beginner-friendly with fun, manageable bumps.`;
  } else if (windSpeed <= 46) {
    summary += `${Math.round(windSpeed)} km/h (${Math.round(windSpeed / 1.852)} kn) ${windDirLabel} wind — ideal strength with plenty of whitecaps and energy to harness.`;
  } else if (windSpeed <= 56) {
    summary += `${Math.round(windSpeed)} km/h (${Math.round(windSpeed / 1.852)} kn) ${windDirLabel} wind — fast, powerful runs for experienced paddlers.`;
  } else {
    summary += `${Math.round(windSpeed)} km/h (${Math.round(windSpeed / 1.852)} kn) ${windDirLabel} wind — dangerously strong, expert conditions only.`;
  }

  // Shoreline / offshore warning
  if (shorelineDirection !== undefined && shorelineAngle !== null) {
    const shoreDirLabel = degToCompass(shorelineDirection);
    if (isOffshore) {
      summary += ` Warning: ${windDirLabel} wind is blowing offshore along this coast — exercise caution and ensure safe exit points.`;
    } else if (shorelineBonus >= 0.4) {
      summary += ` ${windDirLabel} wind runs parallel to the ${shoreDirLabel} coastline — ideal fetch for a long downwind run.`;
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
