import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { PreferencesContext } from "./contexts";

const PREFERENCES_KEY = "nexusflow-settings";

const defaultPreferences = {
  workspaceName: "NexusFlow Workspace",
  defaultTheme: "system",
  desktopNotifications: false,
  sessionReminder: true,
};

function readPreferences() {
  try {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    return stored
      ? { ...defaultPreferences, ...JSON.parse(stored) }
      : defaultPreferences;
  } catch {
    return defaultPreferences;
  }
}

export function PreferencesProvider({ children }) {
  const [preferences, setPreferences] = useState(readPreferences);

  const updatePreferences = useCallback((updates) => {
    const next = { ...preferences, ...updates };
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(next));
    setPreferences(next);
  }, [preferences]);

  useLayoutEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      const useDark = preferences.defaultTheme === "dark" ||
        (preferences.defaultTheme === "system" && media.matches);
      document.documentElement.dataset.theme = useDark ? "dark" : "light";
      document.documentElement.style.colorScheme = useDark ? "dark" : "light";
    };

    applyTheme();
    if (preferences.defaultTheme !== "system") {
      return undefined;
    }

    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [preferences.defaultTheme]);

  const value = useMemo(
    () => ({ preferences, updatePreferences }),
    [preferences, updatePreferences]
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}
