import { isNativePlatform } from "@/lib/capacitor";
import { PREFERENCE_KEYS } from "@/lib/preferenceKeys";

const LEGACY_LOCAL_STORAGE_KEYS = [
  PREFERENCE_KEYS.theme,
  PREFERENCE_KEYS.skill,
  PREFERENCE_KEYS.timeSlot,
  PREFERENCE_KEYS.location,
] as const;

let migrationPromise: Promise<void> | null = null;

function readWebPreference(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeWebPreference(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage full or unavailable — ignore
  }
}

/** One-time copy from browser localStorage into Capacitor Preferences (native only). */
async function migrateLegacyLocalStorage(): Promise<void> {
  if (!isNativePlatform()) return;
  if (migrationPromise) return migrationPromise;

  migrationPromise = (async () => {
    const { Preferences } = await import("@capacitor/preferences");
    const { value: migrated } = await Preferences.get({
      key: PREFERENCE_KEYS.migrationComplete,
    });
    if (migrated === "1") return;

    for (const key of LEGACY_LOCAL_STORAGE_KEYS) {
      const legacy = readWebPreference(key);
      if (legacy === null) continue;

      const { value: existing } = await Preferences.get({ key });
      if (!existing) {
        await Preferences.set({ key, value: legacy });
      }
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Ignore
      }
    }

    await Preferences.set({
      key: PREFERENCE_KEYS.migrationComplete,
      value: "1",
    });
  })();

  return migrationPromise;
}

export async function getPreference(key: string): Promise<string | null> {
  if (!isNativePlatform()) {
    return readWebPreference(key);
  }

  await migrateLegacyLocalStorage();
  const { Preferences } = await import("@capacitor/preferences");
  const { value } = await Preferences.get({ key });
  return value ?? null;
}

export async function setPreference(key: string, value: string): Promise<void> {
  if (!isNativePlatform()) {
    writeWebPreference(key, value);
    return;
  }

  await migrateLegacyLocalStorage();
  const { Preferences } = await import("@capacitor/preferences");
  await Preferences.set({ key, value });
}

/** Synchronous read for web boot — avoids theme flash before React hydrates. */
export function getPreferenceSync(key: string): string | null {
  if (typeof window === "undefined" || isNativePlatform()) return null;
  return readWebPreference(key);
}
