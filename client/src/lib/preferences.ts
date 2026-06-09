import { Preferences } from "@capacitor/preferences";
import { PREFERENCE_KEYS } from "@/lib/preferenceKeys";

const LEGACY_LOCAL_STORAGE_KEYS = [
  PREFERENCE_KEYS.theme,
  PREFERENCE_KEYS.skill,
  PREFERENCE_KEYS.timeSlot,
  PREFERENCE_KEYS.location,
] as const;

let migrationPromise: Promise<void> | null = null;

/** One-time copy from browser localStorage into Capacitor Preferences. */
async function migrateLegacyLocalStorage(): Promise<void> {
  if (migrationPromise) return migrationPromise;

  migrationPromise = (async () => {
    const { value: migrated } = await Preferences.get({
      key: PREFERENCE_KEYS.migrationComplete,
    });
    if (migrated === "1") return;

    if (typeof window !== "undefined") {
      for (const key of LEGACY_LOCAL_STORAGE_KEYS) {
        const legacy = window.localStorage.getItem(key);
        if (legacy === null) continue;

        const { value: existing } = await Preferences.get({ key });
        if (!existing) {
          await Preferences.set({ key, value: legacy });
        }
        window.localStorage.removeItem(key);
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
  await migrateLegacyLocalStorage();
  const { value } = await Preferences.get({ key });
  return value ?? null;
}

export async function setPreference(key: string, value: string): Promise<void> {
  await migrateLegacyLocalStorage();
  await Preferences.set({ key, value });
}
