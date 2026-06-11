import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { MapPin, AlertCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getGetWeatherForecastQueryKey,
  useGetWeatherForecast,
} from "@workspace/api-client-react";
import { LocationSearch } from "@/components/LocationSearch";
import { EmptyState } from "@/components/EmptyState";
import { LoadingGrid } from "@/components/LoadingGrid";
import { SkillSelector, type SkillLevel } from "@/components/SkillSelector";
import { TimeOfDaySelector } from "@/components/TimeOfDaySelector";
import type { DayForecast, GeocodeLocation } from "@workspace/api-client-react";
import { PREFERENCE_KEYS } from "@/lib/preferenceKeys";
import { getPreference, setPreference } from "@/lib/preferences";
import {
  PADDLE_TIME_SLOTS,
  type PaddleTimeSlot,
} from "@/lib/timeSlots";
import { isNativeApp } from "@/lib/platform";
import { enrichGeocodeLocation } from "@/lib/geocode";
import { formatLocationRegion } from "@/lib/utils";

// Busts React Query cache when forecast shape changes (e.g. daily → hourly timeSlots).
const FORECAST_QUERY_VERSION = "v2-hourly";

const ForecastCard = lazy(() =>
  import("@/components/ForecastCard").then((m) => ({ default: m.ForecastCard })),
);

function parseSkill(value: string | null): SkillLevel {
  if (value === "beginner" || value === "intermediate" || value === "advanced") {
    return value;
  }
  return "intermediate";
}

function parseTimeSlot(value: string | null): PaddleTimeSlot {
  if (PADDLE_TIME_SLOTS.some((slot) => slot.value === value)) {
    return value as PaddleTimeSlot;
  }
  return "morning";
}

function parseSavedLocation(value: string | null): GeocodeLocation | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as GeocodeLocation;
    if (
      typeof parsed.name === "string" &&
      typeof parsed.lat === "number" &&
      typeof parsed.lon === "number"
    ) {
      return parsed;
    }
  } catch {
    // Ignore corrupt saved location
  }
  return null;
}

export default function Home() {
  const [selectedLocation, setSelectedLocation] = useState<GeocodeLocation | null>(null);
  const [skill, setSkill] = useState<SkillLevel>("intermediate");
  const [timeSlot, setTimeSlot] = useState<PaddleTimeSlot>("morning");
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [savedSkill, savedTimeSlot, savedLocation] = await Promise.all([
        getPreference(PREFERENCE_KEYS.skill),
        getPreference(PREFERENCE_KEYS.timeSlot),
        getPreference(PREFERENCE_KEYS.location),
      ]);

      if (cancelled) return;

      setSkill(parseSkill(savedSkill));
      setTimeSlot(parseTimeSlot(savedTimeSlot));

      let location = parseSavedLocation(savedLocation);
      if (location) {
        const enriched = await enrichGeocodeLocation(location);
        if (
          enriched.country !== location.country ||
          enriched.admin1 !== location.admin1
        ) {
          location = enriched;
          void setPreference(PREFERENCE_KEYS.location, JSON.stringify(enriched));
        }
      }
      setSelectedLocation(location);

      setPrefsLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!prefsLoaded) return;
    void setPreference(PREFERENCE_KEYS.skill, skill);
  }, [skill, prefsLoaded]);

  useEffect(() => {
    if (!prefsLoaded) return;
    void setPreference(PREFERENCE_KEYS.timeSlot, timeSlot);
  }, [timeSlot, prefsLoaded]);

  const handleLocationSelect = useCallback((location: GeocodeLocation) => {
    void (async () => {
      const enriched = await enrichGeocodeLocation(location);
      setSelectedLocation(enriched);
      void setPreference(PREFERENCE_KEYS.location, JSON.stringify(enriched));
    })();
  }, []);

  const forecastParams = useMemo(
    () =>
      selectedLocation
        ? {
            lat: selectedLocation.lat,
            lon: selectedLocation.lon,
            locationName: selectedLocation.name,
            skill,
          }
        : null,
    [selectedLocation, skill],
  );

  const { data: forecast, isLoading, isFetching, isError, error } = useGetWeatherForecast(
    forecastParams ?? { lat: 0, lon: 0, skill },
    {
      query: {
        enabled: prefsLoaded && !!forecastParams,
        staleTime: 1000 * 60 * 15,
        retry: 0,
        placeholderData: keepPreviousData,
        queryKey: forecastParams
          ? [...getGetWeatherForecastQueryKey(forecastParams), FORECAST_QUERY_VERSION]
          : undefined,
      },
    },
  );

  const isFirstForecastLoad = Boolean(selectedLocation && isLoading && !forecast);
  const isUpdatingForecast = Boolean(selectedLocation && isFetching && forecast);
  const locationRegion = selectedLocation
    ? formatLocationRegion(selectedLocation)
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      {!isNativeApp && (
        <div className="absolute top-0 inset-x-0 h-screen pointer-events-none overflow-hidden -z-10">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px]" />
          <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] rounded-full bg-accent/5 blur-[100px]" />
        </div>
      )}

      <section className="relative z-20 pt-[calc(4.5rem+env(safe-area-inset-top))] pb-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-extrabold text-foreground tracking-tight mb-6">
              Chase the <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Perfect Glide</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 font-medium">
              Predict the ultimate downwind paddle days. We analyze wind, swell size, and directional alignment to score the conditions for your local beach.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full flex flex-col items-center gap-4"
          >
            <LocationSearch
              onSelect={handleLocationSelect}
              selectedName={selectedLocation?.name}
            />
            <div className="flex flex-wrap items-center justify-center gap-3">
              <SkillSelector value={skill} onChange={setSkill} />
              <TimeOfDaySelector value={timeSlot} onChange={setTimeSlot} />
            </div>
          </motion.div>
        </div>
      </section>

      <main className="flex-grow w-full z-10 pb-24">
        <AnimatePresence mode="wait">
          {!prefsLoaded && (
            <motion.div key="prefs-loading" exit={{ opacity: 0 }}>
              <LoadingGrid />
            </motion.div>
          )}

          {prefsLoaded && !selectedLocation && (
            <motion.div key="empty" exit={{ opacity: 0, y: -20 }}>
              <EmptyState />
            </motion.div>
          )}

          {prefsLoaded && selectedLocation && (
            <motion.div
              key="location-header"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mt-4"
            >
              <div className="flex items-center gap-3 mb-8 pl-2">
                <div className="p-3 bg-primary/10 rounded-xl text-primary">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground">
                    {selectedLocation.name}
                  </h2>
                  {locationRegion && (
                    <p className="text-muted-foreground font-medium">
                      {locationRegion}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {prefsLoaded && isFirstForecastLoad && (
            <motion.div key="loading" exit={{ opacity: 0 }}>
              <LoadingGrid />
            </motion.div>
          )}

          {prefsLoaded && isError && selectedLocation && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-2xl mx-auto mt-12 p-6 bg-destructive/10 border border-destructive/20 rounded-2xl flex flex-col items-center text-center"
            >
              <AlertCircle className="w-12 h-12 text-destructive mb-4" />
              <h3 className="text-xl font-bold text-foreground mb-2">Failed to load forecast</h3>
              <p className="text-muted-foreground">
                {error?.data?.error || "We couldn't retrieve the marine weather data for this location. Please try again later."}
              </p>
            </motion.div>
          )}

          {prefsLoaded && forecast && selectedLocation && !isError && (
            <motion.div
              key="forecast"
              className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mt-4"
            >
              {isUpdatingForecast && (
                <div className="flex items-center justify-center gap-2 mb-4 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating forecast…
                </div>
              )}

              <Suspense fallback={<LoadingGrid />}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {forecast.days.map((day: DayForecast, idx: number) => (
                    <ForecastCard
                      key={day.date}
                      forecast={day}
                      index={idx}
                      preferredTimeSlot={timeSlot}
                    />
                  ))}
                </div>
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
