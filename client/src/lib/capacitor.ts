type CapacitorWindow = Window & {
  Capacitor?: {
    isNativePlatform?: () => boolean;
  };
};

/** Detect native shell without importing @capacitor/core into the web bundle. */
export function isNativePlatform(): boolean {
  if (typeof window === "undefined") return false;
  return (
    (window as CapacitorWindow).Capacitor?.isNativePlatform?.() ?? false
  );
}
