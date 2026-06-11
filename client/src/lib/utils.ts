import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Region line for a geocoded place, e.g. "Queensland, Australia". */
export function formatLocationRegion(location: {
  admin1?: string;
  country?: string;
}): string | null {
  const parts = [location.admin1, location.country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

export function getScoreColorClasses(score: number): {
  text: string;
  labelDarkText: string;
  bg: string;
  border: string;
  glow: string;
} {
  if (score >= 8) {
    return {
      text: "text-emerald-900 dark:text-emerald-300",
      labelDarkText: "dark:text-emerald-100",
      bg: "bg-emerald-100 dark:bg-emerald-500/20",
      border: "border-emerald-200 dark:border-emerald-500/30",
      glow: "shadow-emerald-500/30",
    };
  }
  if (score >= 6) {
    return {
      text: "text-blue-900 dark:text-blue-300",
      labelDarkText: "dark:text-blue-100",
      bg: "bg-blue-100 dark:bg-blue-500/20",
      border: "border-blue-200 dark:border-blue-500/30",
      glow: "shadow-blue-500/30",
    };
  }
  if (score >= 4) {
    return {
      text: "text-amber-900 dark:text-amber-300",
      labelDarkText: "dark:text-amber-100",
      bg: "bg-amber-100 dark:bg-amber-500/20",
      border: "border-amber-200 dark:border-amber-500/30",
      glow: "shadow-amber-500/30",
    };
  }
  return {
    text: "text-rose-900 dark:text-rose-300",
    labelDarkText: "dark:text-rose-100",
    bg: "bg-rose-100 dark:bg-rose-500/20",
    border: "border-rose-200 dark:border-rose-500/30",
    glow: "shadow-rose-500/30",
  };
}
