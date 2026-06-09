import { Capacitor } from "@capacitor/core";
import { setBaseUrl } from "@workspace/api-client-react";

/** Native shells cannot use the Vite dev proxy — point API calls at a real origin. */
export function configureNativeApi(): void {
  if (!Capacitor.isNativePlatform()) return;

  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    setBaseUrl(apiUrl);
  }
}
