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
  // Use 0.5° (~55 km) probes with the elevation API.
  // The marine API covers harbours, inlets and rivers so it can't reliably
  // distinguish open ocean from enclosed water. Elevation works much better:
  // clearly inland terrain is > 5 m; open ocean and beach are ≤ 5 m.
  const offset = 0.5;
  const probes = [
    { deg: 0,   dlat:  offset, dlon:  0      },
    { deg: 45,  dlat:  offset, dlon:  offset },
    { deg: 90,  dlat:  0,      dlon:  offset },
    { deg: 135, dlat: -offset, dlon:  offset },
    { deg: 180, dlat: -offset, dlon:  0      },
    { deg: 225, dlat: -offset, dlon: -offset },
    { deg: 270, dlat:  0,      dlon: -offset },
    { deg: 315, dlat:  offset, dlon: -offset },
  ];

  // Batch all 8 probes in a single elevation API call
  const lats = probes.map(p => (lat + p.dlat).toFixed(4)).join(",");
  const lons = probes.map(p => (lon + p.dlon).toFixed(4)).join(",");
  let elevations: number[];
  try {
    const url = `https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lons}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(6000) });
    const data = await resp.json() as { elevation?: (number | null)[] };
    if (!resp.ok || !Array.isArray(data.elevation)) return undefined;
    elevations = data.elevation.map(v => v ?? 0);
  } catch {
    return undefined;
  }

  // Directions where elevation ≤ 5 m are treated as ocean / water
  const LAND_THRESHOLD_M = 5;
  const oceanDirs: number[] = [];
  for (let i = 0; i < probes.length; i++) {
    if (elevations[i] <= LAND_THRESHOLD_M) oceanDirs.push(probes[i].deg);
  }

  if (oceanDirs.length === 0) return undefined;

  // Average the ocean-facing unit vectors
  let x = 0, y = 0;
  for (const deg of oceanDirs) {
    const rad = (deg * Math.PI) / 180;
    x += Math.cos(rad);
    y += Math.sin(rad);
  }

  // If vectors nearly cancel (e.g. surrounded by flat coastal plains in every
  // direction), the result would be meaningless — bail out.
  const magnitude = Math.sqrt(x * x + y * y);
  if (magnitude / oceanDirs.length < 0.35) return undefined;

  const avgOceanDeg = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;

  // Shoreline runs perpendicular to the primary ocean-facing direction
  return (avgOceanDeg + 90) % 360;
}

type SkillLevel = "beginner" | "intermediate" | "advanced";

interface SkillProfile {
  windIdealMin: number;   // km/h
  windIdealMax: number;
  windDanger: number;     // above this, score drops to 0
  swellIdealMin: number;  // metres
  swellIdealMax: number;
  swellDanger: number;    // above this, score drops to 0
}

const SKILL_PROFILES: Record<SkillLevel, SkillProfile> = {
  beginner: {
    windIdealMin: 19, windIdealMax: 32, windDanger: 46,
    swellIdealMin: 0.4, swellIdealMax: 1.5, swellDanger: 2.5,
  },
  intermediate: {
    windIdealMin: 28, windIdealMax: 46, windDanger: 65,
    swellIdealMin: 1.0, swellIdealMax: 2.5, swellDanger: 3.5,
  },
  advanced: {
    windIdealMin: 37, windIdealMax: 65, windDanger: 80,
    swellIdealMin: 1.5, swellIdealMax: 3.5, swellDanger: 5.0,
  },
};

/**
 * Score a value against a skill profile band. Returns max points if value is
 * inside the ideal band, declining linearly as it moves outside, hitting 0 at
 * the danger threshold (above) or at zero/very small (below).
 */
function bandScore(value: number, idealMin: number, idealMax: number, danger: number, maxPts: number): number {
  if (value >= idealMin && value <= idealMax) return maxPts;
  if (value < idealMin) {
    // Below ideal — linear decline from maxPts at idealMin to 0 at zero
    return Math.max(0, maxPts * (value / idealMin));
  }
  // Above ideal — linear decline from maxPts at idealMax to 0 at danger
  if (value >= danger) return 0;
  return Math.max(0, maxPts * (1 - (value - idealMax) / (danger - idealMax)));
}

function scorePaddlingDay(params: {
  windSpeed: number;       // km/h
  windDirection: number;   // degrees meteorological
  swellHeight: number;     // metres
  swellPeriod: number;     // seconds
  swellDirection: number;  // degrees
  shorelineDirection?: number;
  skill: SkillLevel;
}): { score: number; summary: string; conditionLabel: string; alignmentAngle: number } {
  const { windSpeed, windDirection, swellHeight, swellPeriod, swellDirection, shorelineDirection, skill } = params;
  const profile = SKILL_PROFILES[skill];

  const alignmentAngle = angleDiff(windDirection, swellDirection);
  const opposing = alignmentAngle > 120;

  // ─── Wind / Swell alignment (max 3.5 pts) ───────────────────────────────
  // Beginners care less about alignment (they're not chasing big runners).
  // Advanced paddlers can handle some cross chop.
  const alignmentMax = skill === "beginner" ? 2.5 : 3.5;
  let alignmentScore: number;
  if      (alignmentAngle <= 20)  alignmentScore =  alignmentMax;       // perfectly aligned
  else if (alignmentAngle <= 45)  alignmentScore =  alignmentMax * 0.7; // good
  else if (alignmentAngle <= 70)  alignmentScore =  alignmentMax * 0.4; // acceptable cross
  else if (alignmentAngle <= 90)  alignmentScore =  0.3;                // messy cross
  else if (alignmentAngle <= 120) alignmentScore = skill === "advanced" ? -0.2 : -0.5;
  else                            alignmentScore = skill === "advanced" ? -1.5 : -2.0; // opposing

  // ─── Wind speed (max 2.5 pts), tuned to skill profile ────────────────────
  const windScore = bandScore(windSpeed, profile.windIdealMin, profile.windIdealMax, profile.windDanger, 2.5);

  // ─── Swell height (max 2.5 pts), tuned to skill profile ──────────────────
  const swellScore = bandScore(swellHeight, profile.swellIdealMin, profile.swellIdealMax, profile.swellDanger, 2.5);

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

  // ─── Shoreline alignment (wind + swell vs shore, max 1.0 pt, penalty for offshore) ──
  // Ideal: both wind AND swell run parallel to the coast for a long downwind run.
  // Offshore wind (perpendicular away from shore) is a safety hazard.
  let shorelineBonus = 0;
  let shorelineAngle: number | null = null;   // wind vs shore
  let swellShoreAngle: number | null = null;  // swell vs shore
  let combinedShoreAngle: number | null = null; // weighted average, returned to client
  let shorelineAlignmentLabel: string | null = null;
  let isOffshore = false;
  if (shorelineDirection !== undefined && shorelineDirection !== null) {
    // Wind angle to shore-parallel axis (bidirectional — 0° = parallel, 90° = perpendicular)
    const windDiff1 = angleDiff(windDirection, shorelineDirection);
    const windDiff2 = angleDiff(windDirection, (shorelineDirection + 180) % 360);
    shorelineAngle = Math.min(windDiff1, windDiff2);

    // Swell angle to shore-parallel axis
    const swellDiff1 = angleDiff(swellDirection, shorelineDirection);
    const swellDiff2 = angleDiff(swellDirection, (shorelineDirection + 180) % 360);
    swellShoreAngle = Math.min(swellDiff1, swellDiff2);

    // Combined angle stored for reference but scoring uses wind-only
    combinedShoreAngle = Math.round(shorelineAngle);

    // Wind direction is the FROM direction (meteorological convention).
    // Offshore = wind coming FROM the land side (i.e. blowing out to sea).
    // The land-side perpendicular to the shoreline is (shorelineDirection + 90).
    // We do NOT check the ocean-side perpendicular (shorelineDirection + 270)
    // because wind FROM that direction is onshore — safe, not a hazard.
    const offshoreAngle = angleDiff(windDirection, (shorelineDirection + 90) % 360);
    isOffshore = offshoreAngle <= 35;

    if (isOffshore) {
      shorelineBonus = -1.0;
      shorelineAlignmentLabel = "Offshore";
    } else if (shorelineAngle <= 15) {
      shorelineBonus = 1.0;
      shorelineAlignmentLabel = "Perfect";
    } else if (shorelineAngle <= 30) {
      shorelineBonus = 0.75;
      shorelineAlignmentLabel = "Excellent";
    } else if (shorelineAngle <= 50) {
      shorelineBonus = 0.4;
      shorelineAlignmentLabel = "Good";
    } else if (shorelineAngle <= 70) {
      shorelineBonus = 0.1;
      shorelineAlignmentLabel = "Fair";
    } else {
      shorelineBonus = 0;
      shorelineAlignmentLabel = "Poor";
    }
  }

  // ─── Total ────────────────────────────────────────────────────────────────
  let score = alignmentScore + windScore + swellScore + periodScore + shorelineBonus;

  // Hard cap for opposing conditions — opposing wind kills all forward glide.
  if (opposing) score = Math.min(score, 3.5);

  // Hard cap if conditions exceed the paddler's safe ceiling
  if (windSpeed >= profile.windDanger || swellHeight >= profile.swellDanger) {
    const safeCap = skill === "beginner" ? 2.5 : skill === "intermediate" ? 4.5 : 6.0;
    score = Math.min(score, safeCap);
  }

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

  // Shoreline / offshore alignment summary
  if (shorelineDirection !== undefined && shorelineAngle !== null && swellShoreAngle !== null) {
    const shoreDirLabel = degToCompass(shorelineDirection);
    if (isOffshore) {
      summary += ` Warning: ${windDirLabel} wind is blowing offshore along this coast — exercise caution and ensure safe exit points.`;
    } else if (shorelineAlignmentLabel === "Perfect" || shorelineAlignmentLabel === "Excellent") {
      summary += ` Wind (${Math.round(shorelineAngle)}° off shore) and swell (${Math.round(swellShoreAngle)}° off shore) are both tracking along the ${shoreDirLabel} coastline — ideal alignment for a long downwind run.`;
    } else if (shorelineAlignmentLabel === "Good") {
      summary += ` Wind and swell are reasonably aligned with the ${shoreDirLabel} coastline (${combinedShoreAngle}° combined offset) — decent run potential with some angle.`;
    } else if (combinedShoreAngle !== null && combinedShoreAngle > 70) {
      summary += ` Wind and swell are significantly off the ${shoreDirLabel} shoreline direction (${combinedShoreAngle}° combined offset) — limited run potential along this coast.`;
    }
  }

  // Skill-specific verdict
  if (skill === "beginner") {
    if (windSpeed >= profile.windDanger || swellHeight >= profile.swellDanger) {
      summary += ` Beginner verdict: too much going on — sit this one out or stick to a sheltered bay.`;
    } else if (score >= 6) {
      summary += ` Beginner verdict: comfortable conditions to build confidence and practice runs.`;
    }
  } else if (skill === "advanced") {
    if (score >= 7 && (windSpeed >= profile.windIdealMin || swellHeight >= profile.swellIdealMin)) {
      summary += ` Advanced verdict: powerful day — bring the downwind board and chase the bumps.`;
    }
  }

  return {
    score,
    summary,
    conditionLabel,
    alignmentAngle: Math.round(alignmentAngle),
    shorelineAlignmentAngle: combinedShoreAngle,
    shorelineAlignmentLabel,
  };
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
    skill: req.query.skill,
  });

  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid parameters. Provide lat and lon as numbers." });
    return;
  }

  const { lat, lon, locationName } = parseResult.data;
  const skill: SkillLevel = (parseResult.data.skill as SkillLevel | undefined) ?? "intermediate";
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

      const { score, summary, conditionLabel, alignmentAngle, shorelineAlignmentAngle, shorelineAlignmentLabel } = scorePaddlingDay({
        windSpeed,
        windDirection,
        swellHeight,
        swellPeriod,
        swellDirection,
        shorelineDirection,
        skill,
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
        shorelineAlignmentAngle,
        shorelineAlignmentLabel,
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
