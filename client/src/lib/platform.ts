import { Capacitor } from "@capacitor/core";

export const isNativeApp = Capacitor.isNativePlatform();

/** Short debounce — geocoding hits Open-Meteo directly, not the dev API server. */
export const geocodeDebounceMs = isNativeApp ? 250 : 300;
