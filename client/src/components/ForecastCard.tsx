import { memo, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { Wind, Waves, Compass } from "lucide-react";
import { cn, getScoreColorClasses } from "@/lib/utils";
import type { DayForecast } from "@workspace/api-client-react";
import { Slider } from "@/components/ui/slider";
import {
  PADDLE_TIME_SLOTS,
  resolveActiveTimeSlot,
  slotToIndex,
  type PaddleTimeSlot,
} from "@/lib/timeSlots";

interface ForecastCardProps {
  forecast: DayForecast;
  index: number;
  preferredTimeSlot: PaddleTimeSlot;
}

export const ForecastCard = memo(function ForecastCard({
  forecast,
  index,
  preferredTimeSlot,
}: ForecastCardProps) {
  const [slotIndex, setSlotIndex] = useState(() => slotToIndex(preferredTimeSlot));

  useEffect(() => {
    setSlotIndex(slotToIndex(preferredTimeSlot));
  }, [preferredTimeSlot]);

  const activeSlot = resolveActiveTimeSlot(forecast, slotIndex);

  const dateObj = parseISO(forecast.date);
  const colors = getScoreColorClasses(activeSlot.score);
  const animationDelay = Math.min(index * 0.05, 0.3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: animationDelay, ease: "easeOut" }}
      className="group relative bg-card hover:bg-card/90 border border-border hover:border-primary/30 rounded-3xl p-6 shadow-lg shadow-black/5 hover:shadow-xl transition-[background-color,border-color,box-shadow] duration-300 flex flex-col h-full"
    >
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="font-display text-2xl font-bold text-foreground">
            {forecast.dayLabel}
          </h3>
          <p className="text-muted-foreground font-medium mt-1">
            {format(dateObj, "MMM d, yyyy")}
          </p>
        </div>

        <div className="flex flex-col items-center text-center">
          <div
            className={cn(
              "flex items-center justify-center w-16 h-16 rounded-full border-4 font-display text-2xl font-black shadow-lg transition-all duration-300 group-hover:scale-110",
              colors.bg,
              colors.text,
              colors.border,
              colors.glow,
            )}
          >
            {activeSlot.score}
          </div>
          <span className={cn("mt-2 text-sm font-bold uppercase tracking-wider", colors.labelText)}>
            {activeSlot.conditionLabel}
          </span>
        </div>
      </div>

      <p className="text-foreground/80 leading-relaxed mb-6 flex-grow">
        {activeSlot.summary}
      </p>

      <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border/50">
        <div className="flex flex-col gap-2 p-3 rounded-2xl bg-muted/30">
          <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
            <Wind className="w-4 h-4 text-primary" />
            Wind
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg">
              {activeSlot.windSpeed}
              <span className="text-sm font-normal text-muted-foreground">km/h</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Compass
              className="w-4 h-4 text-primary/70"
              style={{ transform: `rotate(${activeSlot.windDirection}deg)` }}
            />
            {activeSlot.windDirectionLabel}
          </div>
        </div>

        <div className="flex flex-col gap-2 p-3 rounded-2xl bg-muted/30">
          <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
            <Waves className="w-4 h-4 text-primary" />
            Swell
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg">
              {activeSlot.swellHeight}
              <span className="text-sm font-normal text-muted-foreground">m</span>
            </span>
            <span className="text-muted-foreground text-sm">@ {activeSlot.swellPeriod}s</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Compass
              className="w-4 h-4 text-primary/70"
              style={{ transform: `rotate(${activeSlot.swellDirection}deg)` }}
            />
            {activeSlot.swellDirectionLabel}
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-border/50">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Time of day
          </span>
          <span className="text-sm font-medium text-foreground">
            {activeSlot.label}
          </span>
        </div>
        <Slider
          value={[slotIndex]}
          min={0}
          max={3}
          step={1}
          onValueChange={(values) => {
            const next = values[0];
            if (next !== undefined) setSlotIndex(next);
          }}
          aria-label={`Time of day for ${forecast.dayLabel}`}
        />
        <div className="mt-2 grid grid-cols-4 gap-1 text-[10px] text-muted-foreground text-center">
          {PADDLE_TIME_SLOTS.map((slot, i) => (
            <span
              key={slot.value}
              className={cn(
                "truncate",
                i === slotIndex && "text-primary font-semibold",
              )}
            >
              {slot.shortLabel}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
});
