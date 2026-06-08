import { useState, useRef, useEffect } from "react";
import { ChevronDown, Award, Star, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export type SkillLevel = "beginner" | "intermediate" | "advanced";

const SKILLS: { value: SkillLevel; label: string; description: string; Icon: typeof Award }[] = [
  { value: "beginner", label: "Beginner", description: "Light wind, small swell", Icon: Sparkles },
  { value: "intermediate", label: "Intermediate", description: "Standard downwind conditions", Icon: Star },
  { value: "advanced", label: "Advanced", description: "Big wind, powerful swell", Icon: Award },
];

interface SkillSelectorProps {
  value: SkillLevel;
  onChange: (skill: SkillLevel) => void;
}

export function SkillSelector({ value, onChange }: SkillSelectorProps) {
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

  const current = SKILLS.find((s) => s.value === value) ?? SKILLS[1];
  const CurrentIcon = current.Icon;

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
          "shadow-[0_4px_16px_rgb(0,0,0,0.15)]"
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <CurrentIcon className="h-4 w-4 text-primary" />
        <span className="text-white/70 font-medium">Skill:</span>
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
            className="absolute z-50 mt-2 left-1/2 -translate-x-1/2 min-w-[240px] bg-background/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl overflow-hidden py-1.5"
            role="listbox"
          >
            {SKILLS.map((skill) => {
              const Icon = skill.Icon;
              const selected = skill.value === value;
              return (
                <li key={skill.value} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(skill.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-4 py-2.5 hover:bg-muted/60 focus:bg-muted/60 focus:outline-none transition-colors flex items-center gap-3",
                      selected && "bg-primary/10"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", selected ? "text-primary" : "text-muted-foreground")} />
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground text-sm">{skill.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{skill.description}</div>
                    </div>
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
