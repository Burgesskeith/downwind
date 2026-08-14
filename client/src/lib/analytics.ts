import { isNativePlatform } from "@/lib/capacitor";

/** Allowed param values for Firebase Analytics custom events. */
type AnalyticsParamValue = string | number | boolean;

export type AnalyticsParams = Record<string, AnalyticsParamValue | null | undefined>;

type WebkitMessageHandler = {
  postMessage: (message: unknown) => void;
};

type WebkitWindow = Window & {
  webkit?: {
    messageHandlers?: {
      WutherAnalytics?: WebkitMessageHandler;
    };
  };
};

function cleanParams(
  params?: AnalyticsParams,
): Record<string, AnalyticsParamValue> | undefined {
  if (!params) return undefined;

  const cleaned: Record<string, AnalyticsParamValue> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    cleaned[key] = value;
  }
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

/** Wait for the native WKScriptMessageHandler registered by WutherBridgeViewController. */
async function waitForAnalyticsHandler(
  timeoutMs = 5000,
): Promise<WebkitMessageHandler | null> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const handler = (window as WebkitWindow).webkit?.messageHandlers?.WutherAnalytics;
    if (handler) return handler;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return (window as WebkitWindow).webkit?.messageHandlers?.WutherAnalytics ?? null;
}

function postNativeEvent(name: string, params?: AnalyticsParams): void {
  const handler = (window as WebkitWindow).webkit?.messageHandlers?.WutherAnalytics;
  if (!handler) return;
  handler.postMessage({
    name,
    params: cleanParams(params) ?? {},
  });
}

/** Warm the native analytics bridge once Capacitor is up. */
export async function initAnalytics(): Promise<void> {
  if (!isNativePlatform()) return;
  await waitForAnalyticsHandler();
}

export async function logAppEvent(
  name: string,
  params?: AnalyticsParams,
): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    const handler = await waitForAnalyticsHandler(1000);
    if (!handler) return;
    postNativeEvent(name, params);
  } catch {
    // Analytics must never break the UI.
  }
}

export async function logScreenView(screenName: string): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    const handler = await waitForAnalyticsHandler(1000);
    if (!handler) return;
    // Firebase recommended screen_view event shape.
    postNativeEvent("screen_view", {
      screen_name: screenName,
      screen_class: screenName,
    });
  } catch {
    // Analytics must never break the UI.
  }
}
