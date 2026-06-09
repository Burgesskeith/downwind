export type PaddleTimeSlot =
  | "early-morning"
  | "morning"
  | "midday"
  | "late-afternoon";

export const PADDLE_TIME_SLOTS: {
  value: PaddleTimeSlot;
  label: string;
  shortLabel: string;
  sampleHour: number;
}[] = [
  { value: "early-morning", label: "5am – 8am", shortLabel: "5–8am", sampleHour: 7 },
  { value: "morning", label: "9am – 12pm", shortLabel: "9–12pm", sampleHour: 10 },
  { value: "midday", label: "12pm – 3pm", shortLabel: "12–3pm", sampleHour: 13 },
  { value: "late-afternoon", label: "3pm – 6pm", shortLabel: "3–6pm", sampleHour: 16 },
];

export function slotToIndex(slot: PaddleTimeSlot): number {
  const idx = PADDLE_TIME_SLOTS.findIndex((s) => s.value === slot);
  return idx >= 0 ? idx : 1;
}

export function indexToSlot(index: number): PaddleTimeSlot {
  return PADDLE_TIME_SLOTS[index]?.value ?? "morning";
}

/** Pick the active time slot; falls back to day-level fields if timeSlots is missing. */
export function resolveActiveTimeSlot(
  forecast: {
    score: number;
    windSpeed: number;
    windDirection: number;
    windDirectionLabel: string;
    swellHeight: number;
    swellPeriod: number;
    swellDirection: number;
    swellDirectionLabel: string;
    alignmentAngle: number;
    shorelineAlignmentAngle: number | null;
    shorelineAlignmentLabel: string | null;
    summary: string;
    conditionLabel: string;
    timeSlots?: Array<{
      slot: PaddleTimeSlot;
      label: string;
      sampleHour: number;
      score: number;
      windSpeed: number;
      windDirection: number;
      windDirectionLabel: string;
      swellHeight: number;
      swellPeriod: number;
      swellDirection: number;
      swellDirectionLabel: string;
      alignmentAngle: number;
      shorelineAlignmentAngle: number | null;
      shorelineAlignmentLabel: string | null;
      summary: string;
      conditionLabel: string;
    }>;
  },
  slotIndex: number,
) {
  const slots = forecast.timeSlots;
  if (Array.isArray(slots) && slots.length > 0) {
    return slots[slotIndex] ?? slots[0];
  }

  const slotMeta = PADDLE_TIME_SLOTS[slotIndex] ?? PADDLE_TIME_SLOTS[1];
  return {
    slot: slotMeta.value,
    label: slotMeta.label,
    sampleHour: slotMeta.sampleHour,
    score: forecast.score,
    windSpeed: forecast.windSpeed,
    windDirection: forecast.windDirection,
    windDirectionLabel: forecast.windDirectionLabel,
    swellHeight: forecast.swellHeight,
    swellPeriod: forecast.swellPeriod,
    swellDirection: forecast.swellDirection,
    swellDirectionLabel: forecast.swellDirectionLabel,
    alignmentAngle: forecast.alignmentAngle,
    shorelineAlignmentAngle: forecast.shorelineAlignmentAngle,
    shorelineAlignmentLabel: forecast.shorelineAlignmentLabel,
    summary: forecast.summary,
    conditionLabel: forecast.conditionLabel,
  };
}
