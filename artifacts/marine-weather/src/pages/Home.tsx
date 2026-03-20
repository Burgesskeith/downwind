import { useState } from "react";
import { MapPin, AlertCircle, Navigation } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useGetWeatherForecast } from "@workspace/api-client-react";
import { LocationSearch } from "@/components/LocationSearch";
import { ForecastCard } from "@/components/ForecastCard";
import { EmptyState } from "@/components/EmptyState";
import { LoadingGrid } from "@/components/LoadingGrid";
import type { GeocodeLocation } from "@workspace/api-client-react/src/generated/api.schemas";

const COMPASS_POINTS = [
  { label: "N",   deg: 0 },
  { label: "NE",  deg: 45 },
  { label: "E",   deg: 90 },
  { label: "SE",  deg: 135 },
  { label: "S",   deg: 180 },
  { label: "SW",  deg: 225 },
  { label: "W",   deg: 270 },
  { label: "NW",  deg: 315 },
];

export default function Home() {
  const [selectedLocation, setSelectedLocation] = useState<GeocodeLocation | null>(null);
  const [paddlingDirection, setPaddlingDirection] = useState<number | undefined>(undefined);

  const { data: forecast, isLoading, isError, error } = useGetWeatherForecast(
    { 
      lat: selectedLocation?.lat as number, 
      lon: selectedLocation?.lon as number,
      locationName: selectedLocation?.name,
      paddlingDirection,
    },
    {
      query: {
        enabled: !!selectedLocation,
        staleTime: 1000 * 60 * 15,
        retry: 1
      }
    }
  );

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      {/* Decorative background blurs */}
      <div className="absolute top-0 inset-x-0 h-screen pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] rounded-full bg-accent/5 blur-[100px]" />
      </div>

      {/* Hero Section */}
      <section className="relative pt-24 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 -z-20">
          <img 
            src={`${import.meta.env.BASE_URL}images/hero-ocean.png`}
            alt="Deep blue ocean waves rolling in the open sea"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/95 to-background" />
        </div>

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
              onSelect={setSelectedLocation} 
              selectedName={selectedLocation?.name}
            />

            {/* Shoreline / Paddling Direction Picker */}
            <div className="flex flex-col items-center gap-2 w-full max-w-2xl">
              <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                <Navigation className="w-4 h-4 text-primary" />
                Shoreline run direction
                <span className="text-xs text-muted-foreground/60">(optional — earns bonus points when wind is parallel)</span>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {COMPASS_POINTS.map((pt) => (
                  <button
                    key={pt.label}
                    onClick={() =>
                      setPaddlingDirection(paddlingDirection === pt.deg ? undefined : pt.deg)
                    }
                    className={[
                      "px-4 py-2 rounded-xl text-sm font-bold border transition-all duration-200",
                      paddlingDirection === pt.deg
                        ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                        : "bg-card border-border text-foreground hover:border-primary/50 hover:bg-primary/5"
                    ].join(" ")}
                  >
                    <span className="flex items-center gap-1.5">
                      <Navigation
                        className="w-3 h-3"
                        style={{ transform: `rotate(${pt.deg}deg)` }}
                      />
                      {pt.label}
                    </span>
                  </button>
                ))}
                {paddlingDirection !== undefined && (
                  <button
                    onClick={() => setPaddlingDirection(undefined)}
                    className="px-4 py-2 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all duration-200"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="flex-grow w-full z-10 pb-24">
        <AnimatePresence mode="wait">
          {!selectedLocation && !isLoading && (
            <motion.div key="empty" exit={{ opacity: 0, y: -20 }}>
              <EmptyState />
            </motion.div>
          )}

          {isLoading && (
            <motion.div key="loading" exit={{ opacity: 0 }}>
              <LoadingGrid />
            </motion.div>
          )}

          {isError && selectedLocation && (
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
                {error?.error || "We couldn't retrieve the marine weather data for this location. Please try again later."}
              </p>
            </motion.div>
          )}

          {forecast && selectedLocation && !isLoading && !isError && (
            <motion.div 
              key="forecast"
              className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mt-4"
            >
              <div className="flex items-center gap-3 mb-8 pl-2">
                <div className="p-3 bg-primary/10 rounded-xl text-primary">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground">
                    {forecast.locationName}
                  </h2>
                  <p className="text-muted-foreground font-medium flex items-center gap-2">
                    {forecast.lat.toFixed(4)}°, {forecast.lon.toFixed(4)}°
                    {paddlingDirection !== undefined && (
                      <span className="inline-flex items-center gap-1 text-primary text-sm font-semibold bg-primary/10 px-2 py-0.5 rounded-full">
                        <Navigation className="w-3 h-3" style={{ transform: `rotate(${paddlingDirection}deg)` }} />
                        Shoreline: {COMPASS_POINTS.find(p => p.deg === paddlingDirection)?.label}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {forecast.days.map((day, idx) => (
                  <ForecastCard key={day.date} forecast={day} index={idx} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
