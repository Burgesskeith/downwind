import React from "react";
import {
  View,
  Text,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { ocean, getScoreLevel, getScoreColors } from "@/constants/colors";
import type { DayForecast } from "@workspace/api-client-react/src/generated/api.schemas";

interface Props {
  day: DayForecast;
}

function WindArrow({ degrees, size = 14, color }: { degrees: number; size?: number; color: string }) {
  return (
    <View style={{ transform: [{ rotate: `${degrees}deg` }] }}>
      <Feather name="navigation" size={size} color={color} />
    </View>
  );
}

export function ForecastCard({ day }: Props) {
  const level = getScoreLevel(day.score);
  const { color, bg } = getScoreColors(level);
  const isOpposing = day.alignmentAngle > 120;

  return (
    <View style={[styles.card, isOpposing && styles.cardOpposing]}>
      {/* Top row: day + score */}
      <View style={styles.topRow}>
        <View style={styles.dayInfo}>
          <Text style={styles.dayLabel}>{day.dayLabel}</Text>
          <Text style={styles.dateText}>{formatDate(day.date)}</Text>
        </View>
        <View style={[styles.scoreBubble, { backgroundColor: bg, borderColor: color }]}>
          <Text style={[styles.scoreNumber, { color }]}>{day.score.toFixed(1)}</Text>
          <Text style={[styles.conditionLabel, { color }]}>{day.conditionLabel.toUpperCase()}</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Metrics row */}
      <View style={styles.metricsRow}>
        {/* Wind */}
        <View style={styles.metric}>
          <View style={styles.metricHeader}>
            <Feather name="wind" size={13} color={ocean.textSecondary} />
            <Text style={styles.metricLabel}>WIND</Text>
          </View>
          <View style={styles.metricValue}>
            <WindArrow degrees={day.windDirection} color={ocean.teal} />
            <Text style={styles.metricMain}>{Math.round(day.windSpeed)}</Text>
            <Text style={styles.metricUnit}>km/h</Text>
          </View>
          <Text style={styles.metricSub}>{day.windDirectionLabel}</Text>
        </View>

        {/* Swell */}
        <View style={styles.metric}>
          <View style={styles.metricHeader}>
            <Feather name="activity" size={13} color={ocean.textSecondary} />
            <Text style={styles.metricLabel}>SWELL</Text>
          </View>
          <View style={styles.metricValue}>
            <WindArrow degrees={day.swellDirection} color={ocean.teal} />
            <Text style={styles.metricMain}>{day.swellHeight.toFixed(1)}</Text>
            <Text style={styles.metricUnit}>m</Text>
          </View>
          <Text style={styles.metricSub}>{day.swellDirectionLabel} @ {Math.round(day.swellPeriod)}s</Text>
        </View>

        {/* Alignment */}
        <View style={styles.metric}>
          <View style={styles.metricHeader}>
            <Feather name="crosshair" size={13} color={ocean.textSecondary} />
            <Text style={styles.metricLabel}>ALIGN</Text>
          </View>
          <View style={styles.metricValue}>
            <Text style={[styles.metricMain, { color: isOpposing ? ocean.poor : day.alignmentAngle <= 45 ? ocean.epic : ocean.fair }]}>
              {day.alignmentAngle}°
            </Text>
          </View>
          <Text style={[styles.metricSub, isOpposing && { color: ocean.poor }]}>
            {isOpposing ? "opposing" : day.alignmentAngle <= 30 ? "aligned" : day.alignmentAngle <= 70 ? "offset" : "cross"}
          </Text>
        </View>
      </View>

      {/* Summary */}
      <Text style={styles.summary} numberOfLines={3}>{day.summary}</Text>
    </View>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  return d.toLocaleDateString("en-AU", { month: "short", day: "numeric", timeZone: "UTC" });
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: ocean.bgCard,
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: ocean.border,
  },
  cardOpposing: {
    borderColor: "rgba(230,57,70,0.2)",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  dayInfo: {
    flex: 1,
  },
  dayLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: ocean.text,
    lineHeight: 28,
  },
  dateText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: ocean.textSecondary,
    marginTop: 2,
  },
  scoreBubble: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 70,
  },
  scoreNumber: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    lineHeight: 30,
  },
  conditionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: ocean.border,
    marginBottom: 14,
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  metric: {
    flex: 1,
    alignItems: "flex-start",
    paddingRight: 8,
  },
  metricHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  metricLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: ocean.textSecondary,
    letterSpacing: 1,
  },
  metricValue: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginBottom: 3,
  },
  metricMain: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: ocean.text,
  },
  metricUnit: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: ocean.textSecondary,
  },
  metricSub: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: ocean.textSecondary,
  },
  summary: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: ocean.textSecondary,
    lineHeight: 19,
    borderTopWidth: 1,
    borderTopColor: ocean.border,
    paddingTop: 12,
  },
});
