import { isNativePlatform } from "@/lib/capacitor";

/** Native shells cannot use the Vite dev proxy — point API calls at a real origin. */
export async function configureNativeApi(): Promise<void> {
  if (!isNativePlatform()) return;

  document.documentElement.classList.add("capacitor-native");

  const apiUrl = import.meta.env.VITE_API_URL;
  if (!apiUrl) return;

  const { setBaseUrl } = await import("@workspace/api-client-react");
  setBaseUrl(apiUrl);
}
