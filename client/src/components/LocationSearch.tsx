import { useState, useRef, useEffect, useCallback, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, MapPin, Loader2, Navigation } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDebounce } from "@/hooks/use-debounce";
import { geocodeFromOpenMeteo } from "@/lib/geocode";
import { geocodeDebounceMs } from "@/lib/platform";
import { cn } from "@/lib/utils";
import type { GeocodeLocation } from "@workspace/api-client-react";

interface LocationSearchProps {
  onSelect: (location: GeocodeLocation) => void;
  selectedName?: string;
}

export const LocationSearch = memo(function LocationSearch({
  onSelect,
  selectedName,
}: LocationSearchProps) {
  const [query, setQuery] = useState(selectedName || "");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, geocodeDebounceMs);
  const isDebouncing = query.length > 2 && query !== debouncedQuery;

  const { data, isError, isFetching } = useQuery({
    queryKey: ["geocode", debouncedQuery],
    queryFn: ({ signal }) => geocodeFromOpenMeteo(debouncedQuery, signal),
    enabled: debouncedQuery.length > 2,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60,
    retry: 0,
  });

  const showSearchSpinner = isDebouncing || (isFetching && debouncedQuery.length > 2);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    (loc: GeocodeLocation) => {
      setQuery(loc.name);
      setIsOpen(false);
      onSelect(loc);
    },
    [onSelect],
  );

  return (
    <div className="relative w-full max-w-2xl mx-auto" ref={containerRef}>
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/70 group-focus-within:text-primary transition-colors">
          <Search className="h-5 w-5" />
        </div>
        <input
          type="text"
          className={cn(
            "block w-full pl-12 pr-12 py-4 bg-slate-900 backdrop-blur-md",
            "border border-white/20 rounded-2xl",
            "text-white placeholder-white/60 caret-white",
            "focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary/50",
            "shadow-[0_8px_30px_rgb(0,0,0,0.2)]",
            "transition-all duration-300 text-lg font-medium",
          )}
          placeholder="Beach or coastal town..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (query.length > 2) setIsOpen(true);
          }}
        />
        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
          {showSearchSpinner && (
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
          )}
          {!showSearchSpinner && query && (
            <Navigation className="h-5 w-5 text-muted-foreground opacity-50" />
          )}
        </div>
      </div>

      <AnimatePresence>
        {isOpen && debouncedQuery.length > 2 && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute z-50 w-full mt-2 bg-background/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl overflow-hidden"
          >
            {showSearchSpinner && (
              <div className="p-4 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Searching
                locations...
              </div>
            )}

            {!showSearchSpinner && isError && (
              <div className="p-4 text-center text-destructive text-sm">
                Failed to load locations. Please try again.
              </div>
            )}

            {!showSearchSpinner &&
              !isError &&
              data?.results &&
              data.results.length === 0 && (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No coastal locations found for "{debouncedQuery}"
                </div>
              )}

            {!showSearchSpinner &&
              !isError &&
              data?.results &&
              data.results.length > 0 && (
                <ul className="max-h-[300px] overflow-y-auto py-2">
                  {data.results.map((loc) => (
                    <li key={`${loc.lat}-${loc.lon}-${loc.name}`}>
                      <button
                        className="w-full text-left px-4 py-3 hover:bg-muted/50 focus:bg-muted/50 focus:outline-none transition-colors flex items-start gap-3"
                        onClick={() => handleSelect(loc)}
                      >
                        <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                        <div>
                          <div className="font-semibold text-foreground">
                            {loc.name}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {loc.admin1 ? `${loc.admin1}, ` : ""}
                            {loc.country}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
