import { useState, useRef, useEffect } from "react";
import { ChevronDown, Clock } from "lucide-react";
import { motion, AnimatePresence } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { PADDLE_TIME_SLOTS, type PaddleTimeSlot } from "@/lib/timeSlots";

interface TimeOfDaySelectorProps {
  value: PaddleTimeSlot;
  onChange: (slot: PaddleTimeSlot) => void;
}

export function TimeOfDaySelector({ value, onChange }: TimeOfDaySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const current = PADDLE_TIME_SLOTS.find((s) => s.value === value) ?? PADDLE_TIME_SLOTS[1];

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl",
          "bg-slate-900 backdrop-blur-md border border-white/20",
          "text-white text-sm font-semibold",
          "hover:bg-slate-800 hover:border-primary/40 transition-all",
          "shadow-[0_4px_16px_rgb(0,0,0,0.15)]",
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <Clock className="h-4 w-4 text-primary" />
        <span className="text-white/70 font-medium">Time:</span>
        <span>{current.label}</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.ul
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute z-50 mt-2 left-1/2 -translate-x-1/2 min-w-[220px] bg-background/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl overflow-hidden py-1.5"
            role="listbox"
          >
            {PADDLE_TIME_SLOTS.map((slot) => {
              const selected = slot.value === value;
              return (
                <li key={slot.value} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(slot.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-4 py-2.5 hover:bg-muted/60 focus:bg-muted/60 focus:outline-none transition-colors",
                      selected && "bg-primary/10",
                    )}
                  >
                    <div className="font-semibold text-foreground text-sm">{slot.label}</div>
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
