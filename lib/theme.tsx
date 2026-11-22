import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * App-wide light/dark theming.
 *
 * Screens are written against the dark palette (the app's original design).
 * In light mode every dark colour is swapped for its light counterpart via
 * LIGHT_MAP, so:
 *   - `themedStyles({...})` replaces `StyleSheet.create({...})` and returns
 *     styles whose colours follow the active mode.
 *   - `tc("#hex")` converts a single colour for inline props (icons, inputs).
 *   - `useThemeMode()` (called at the top of each screen) re-renders the
 *     screen when the mode changes.
 */

export type ThemePreference = "system" | "dark" | "light";
export type ResolvedMode = "dark" | "light";

const STORAGE_KEY = "gastro.themePreference";

// Dark design colour -> light equivalent. Keys are lower-case.
const LIGHT_MAP: Record<string, string> = {
  "#0f1115": "#f6f6f7", // app background
  "#121418": "#f1f1f3",
  "#181b20": "#ffffff", // cards
  "#181a20": "#ffffff",
  "#1c1f26": "#ffffff",
  "#1f242d": "#ffffff",
  "#20242c": "#ffffff",
  "#27272a": "#e4e4e7", // borders, chips
  "#3f3f46": "#d4d4d8",
  "#52525b": "#a1a1aa",
  "#a1a1aa": "#52525b", // secondary text
  "#d4d4d8": "#3f3f46",
  "#e4e4e7": "#27272a",
  "#f4f4f5": "#18181b", // primary text
  "rgba(15, 17, 21, 0.85)": "rgba(255, 255, 255, 0.92)",
};

let currentMode: ResolvedMode = "dark";

/** The mode currently applied. Safe to call anywhere at render time. */
export const getMode = () => currentMode;

/** Converts a dark-design colour to the active mode's colour. */
export function tc(color: string): string {
  if (currentMode === "dark" || typeof color !== "string") return color;
  return LIGHT_MAP[color.toLowerCase()] ?? color;
}

/** StatusBar style for the active mode. */
export const statusBarStyle = () =>
  currentMode === "dark" ? ("light-content" as const) : ("dark-content" as const);

const COLOR_KEYS = /color$/i; // backgroundColor, borderColor, color, shadowColor, tintColor...

function mapStyle(style: any): any {
  if (!style || typeof style !== "object") return style;
  if (Array.isArray(style)) return style.map(mapStyle);
  const out: any = {};
  for (const k of Object.keys(style)) {
    const v = style[k];
    if (typeof v === "string" && COLOR_KEYS.test(k)) out[k] = tc(v);
    else if (v && typeof v === "object") out[k] = mapStyle(v);
    else out[k] = v;
  }
  return out;
}

/**
 * Drop-in replacement for StyleSheet.create whose colours follow the theme.
 * Each style is computed once per mode and cached.
 */
export function themedStyles<T extends Record<string, any>>(raw: T): T {
  const cache: Partial<Record<ResolvedMode, any>> = { dark: raw };
  const out: any = {};
  for (const key of Object.keys(raw)) {
    Object.defineProperty(out, key, {
      enumerable: true,
      get() {
        const mode = currentMode;
        if (!cache[mode]) {
          const mapped: any = {};
          for (const k of Object.keys(raw)) mapped[k] = mapStyle(raw[k]);
          cache[mode] = mapped;
        }
        return cache[mode][key];
      },
    });
  }
  return out as T;
}

type ThemeContextValue = {
  preference: ThemePreference;
  mode: ResolvedMode;
  setPreference: (p: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  preference: "dark",
  mode: "dark",
  setPreference: () => {},
});

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useSystemColorScheme();
  const [preference, setPref] = useState<ThemePreference>("dark");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === "system" || v === "dark" || v === "light") setPref(v);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const mode: ResolvedMode =
    preference === "system" ? (system === "light" ? "light" : "dark") : preference;

  // Set synchronously during render so every child renders with the new mode.
  currentMode = mode;

  const setPreference = useCallback((p: ThemePreference) => {
    setPref(p);
    AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
  }, []);

  const value = useMemo(() => ({ preference, mode, setPreference }), [preference, mode, setPreference]);

  // Avoid a dark->light flash for users who chose light.
  if (!loaded) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Subscribes a component to theme changes. Call at the top of every screen. */
export function useThemeMode() {
  return useContext(ThemeContext);
}
