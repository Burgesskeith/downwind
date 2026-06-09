import { createContext, useContext, useEffect, useState } from "react";
import { PREFERENCE_KEYS } from "@/lib/preferenceKeys";
import { getPreference, setPreference } from "@/lib/preferences";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  toggle: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyThemeToDocument(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getSystemTheme);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const stored = await getPreference(PREFERENCE_KEYS.theme);
      if (cancelled) return;

      if (stored === "dark" || stored === "light") {
        setTheme(stored);
      } else {
        setTheme(getSystemTheme());
      }
      setPrefsLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!prefsLoaded) return;
    applyThemeToDocument(theme);
    void setPreference(PREFERENCE_KEYS.theme, theme);
  }, [theme, prefsLoaded]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
