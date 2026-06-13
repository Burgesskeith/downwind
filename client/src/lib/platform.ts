import { isNativePlatform } from "@/lib/capacitor";

export function isNativeApp(): boolean {
  return isNativePlatform();
}

/** Short debounce — geocoding hits Open-Meteo directly, not the dev API server. */
export const geocodeDebounceMs = isNativePlatform() ? 250 : 300;
