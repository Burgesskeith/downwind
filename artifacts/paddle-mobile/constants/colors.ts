export const ocean = {
  // Backgrounds
  bg: "#060E1E",
  bgCard: "#0D1B2E",
  bgSurface: "#132033",
  bgElevated: "#1A2A3D",

  // Primary
  teal: "#00C6E0",
  tealDark: "#0098B0",
  tealGlow: "rgba(0,198,224,0.15)",

  // Text
  text: "#EAF4FB",
  textSecondary: "#6E93AE",
  textMuted: "#3D607A",

  // Condition colors
  epic: "#00E5A0",
  epicBg: "rgba(0,229,160,0.12)",
  good: "#00C6E0",
  goodBg: "rgba(0,198,224,0.12)",
  fair: "#F4A261",
  fairBg: "rgba(244,162,97,0.12)",
  poor: "#E63946",
  poorBg: "rgba(230,57,70,0.12)",

  // UI
  border: "rgba(255,255,255,0.07)",
  borderStrong: "rgba(0,198,224,0.2)",
  white: "#FFFFFF",
  overlay: "rgba(6,14,30,0.92)",
};

export type ScoreLevel = "epic" | "good" | "fair" | "poor";

export function getScoreLevel(score: number): ScoreLevel {
  if (score >= 8) return "epic";
  if (score >= 6) return "good";
  if (score >= 4) return "fair";
  return "poor";
}

export function getScoreColors(level: ScoreLevel) {
  switch (level) {
    case "epic": return { color: ocean.epic, bg: ocean.epicBg };
    case "good": return { color: ocean.good, bg: ocean.goodBg };
    case "fair": return { color: ocean.fair, bg: ocean.fairBg };
    case "poor": return { color: ocean.poor, bg: ocean.poorBg };
  }
}

export default {
  light: {
    text: ocean.text,
    background: ocean.bg,
    tint: ocean.teal,
    tabIconDefault: ocean.textMuted,
    tabIconSelected: ocean.teal,
  },
};
