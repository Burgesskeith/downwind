export const PADDLE_TIME_SLOTS = [
  { slot: "early-morning", label: "5am – 8am", sampleHour: 7 },
  { slot: "morning", label: "9am – 12pm", sampleHour: 10 },
  { slot: "midday", label: "12pm – 3pm", sampleHour: 13 },
  { slot: "late-afternoon", label: "3pm – 6pm", sampleHour: 16 },
] as const;

export type PaddleTimeSlotId = (typeof PADDLE_TIME_SLOTS)[number]["slot"];

/** Find the hourly array index for a local date + hour (Open-Meteo timezone=auto). */
export function findHourlyIndex(
  times: string[],
  date: string,
  hour: number,
): number {
  const padded = String(hour).padStart(2, "0");
  const exact = times.findIndex((t) => t.startsWith(`${date}T${padded}:`));
  if (exact >= 0) return exact;

  let bestIdx = -1;
  let bestDiff = Infinity;
  for (let i = 0; i < times.length; i++) {
    if (!times[i].startsWith(date)) continue;
    const h = Number.parseInt(times[i].slice(11, 13), 10);
    const diff = Math.abs(h - hour);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }
  return bestIdx;
}

export function pickHourlyValue<T>(values: (T | null)[], index: number, fallback: T): T {
  if (index < 0) return fallback;
  const value = values[index];
  return value ?? fallback;
}

/** Like pickHourlyValue but preserves 0 and only falls back when the value is null/missing. */
export function pickHourlyNumber(
  values: (number | null)[],
  index: number,
  fallback: number,
): number {
  if (index < 0) return fallback;
  const value = values[index];
  return value ?? fallback;
}

export function pickHourlyNumberOrNull(
  values: (number | null)[],
  index: number,
): number | null {
  if (index < 0) return null;
  return values[index] ?? null;
}
