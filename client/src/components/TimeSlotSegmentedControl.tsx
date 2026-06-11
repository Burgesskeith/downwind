import { cn } from "@/lib/utils";
import { isNativeApp } from "@/lib/platform";
import { PADDLE_TIME_SLOTS } from "@/lib/timeSlots";

interface TimeSlotSegmentedControlProps {
  value: number;
  onChange: (index: number) => void;
  ariaLabel?: string;
}

export function TimeSlotSegmentedControl({
  value,
  onChange,
  ariaLabel,
}: TimeSlotSegmentedControlProps) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="grid grid-cols-4 gap-1.5 p-1.5 rounded-2xl bg-muted/30"
    >
      {PADDLE_TIME_SLOTS.map((slot, index) => {
        const selected = index === value;
        return (
          <button
            key={slot.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(index)}
            className={cn(
              "rounded-xl font-semibold transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
              // 44px min height on native — much easier to tap than a slider thumb
              isNativeApp ? "min-h-11 py-3 text-sm" : "min-h-10 py-2.5 text-xs",
              selected
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/60 active:bg-muted",
            )}
          >
            {slot.shortLabel}
          </button>
        );
      })}
    </div>
  );
}
