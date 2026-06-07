import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { Wind, Waves } from "lucide-react";
import { cn, getScoreColorClasses } from "@/lib/utils";
import type { DayForecast } from "@workspace/api-client-react/src/generated/api.schemas";

interface ForecastCardProps {
  forecast: DayForecast;
  index: number;
}

export function ForecastCard({ forecast, index }: ForecastCardProps) {
  const dateObj = parseISO(forecast.date);
  const colors = getScoreColorClasses(forecast.score);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
      className="group relative bg-card hover:bg-card/90 border border-border hover:border-primary/30 rounded-3xl p-6 shadow-lg shadow-black/5 hover:shadow-xl transition-all duration-300 flex flex-col h-full"
    >
      {/* Date & Score Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="font-display text-2xl font-bold text-foreground">
            {forecast.dayLabel}
          </h3>
          <p className="text-muted-foreground font-medium mt-1">
            {format(dateObj, "MMM d, yyyy")}
          </p>
        </div>
        
        <div className="flex flex-col items-end">
          <div className={cn(
            "flex items-center justify-center w-16 h-16 rounded-full border-4 font-display text-2xl font-black shadow-lg transition-transform group-hover:scale-110",
            colors.bg, colors.text, colors.border, colors.glow
          )}>
            {forecast.score}
          </div>
          <span className={cn("mt-2 text-sm font-bold uppercase tracking-wider", colors.text)}>
            {forecast.conditionLabel}
          </span>
        </div>
      </div>

      {/* Summary */}
      <p className="text-foreground/80 leading-relaxed mb-6 flex-grow">
        {forecast.summary}
      </p>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 mt-auto pt-6 border-t border-border/50">
        
        {/* Wind */}
        <div className="flex flex-col gap-2 p-3 rounded-2xl bg-muted/30">
          <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
            <Wind className="w-4 h-4 text-primary" />
            Wind
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg">{forecast.windSpeed}<span className="text-sm font-normal text-muted-foreground">km/h</span></span>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Compass 
              className="w-4 h-4 text-primary/70 transition-transform duration-500" 
              style={{ transform: `rotate(${forecast.windDirection}deg)` }} 
            />
            {forecast.windDirectionLabel}
          </div>
        </div>

        {/* Swell */}
        <div className="flex flex-col gap-2 p-3 rounded-2xl bg-muted/30">
          <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
            <Waves className="w-4 h-4 text-primary" />
            Swell
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg">{forecast.swellHeight}<span className="text-sm font-normal text-muted-foreground">m</span></span>
            <span className="text-muted-foreground text-sm">@ {forecast.swellPeriod}s</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Compass 
              className="w-4 h-4 text-primary/70 transition-transform duration-500" 
              style={{ transform: `rotate(${forecast.swellDirection}deg)` }} 
            />
            {forecast.swellDirectionLabel}
          </div>
        </div>
        
      </div>
    </motion.div>
  );
}
