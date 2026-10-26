// ============================================================
// VeniLearn LMS - Global Theme Management Store
// Supports: Light, Dark, System (Device) preferences with
// LocalStorage persistence, zero-flicker initialization, and
// dynamic OS media query listeners.
// ============================================================

import { create } from 'zustand';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'venilearn_theme_preference';

// Helper to detect device/OS color scheme preference
export const getSystemTheme = (): ResolvedTheme => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark'; // Default fallback
};

// Helper to resolve the effective theme given a preference
export const resolveEffectiveTheme = (pref: ThemePreference): ResolvedTheme => {
  if (pref === 'system') {
    return getSystemTheme();
  }
  return pref;
};

// Helper to apply the resolved theme to the DOM
export const applyThemeToDOM = (theme: ResolvedTheme): void => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
};

// Get stored preference or default to 'system'
export const getStoredThemePreference = (): ThemePreference => {
  if (typeof window === 'undefined') return 'system';
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch (err) {
    console.warn('Failed to read theme preference from localStorage:', err);
  }
  return 'system';
};

interface ThemeState {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setTheme: (pref: ThemePreference) => void;
}

// Read initial preference and compute initial resolved theme
const initialPreference = getStoredThemePreference();
const initialResolved = resolveEffectiveTheme(initialPreference);

// Immediately apply on module load
applyThemeToDOM(initialResolved);

export const useThemeStore = create<ThemeState>((set, get) => ({
  preference: initialPreference,
  resolvedTheme: initialResolved,

  setTheme: (pref: ThemePreference) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, pref);
    } catch (err) {
      console.warn('Failed to write theme preference to localStorage:', err);
    }

    const resolved = resolveEffectiveTheme(pref);
    applyThemeToDOM(resolved);

    set({ preference: pref, resolvedTheme: resolved });
  }
}));

// Set up dynamic OS listener (runs once in browser environment)
if (typeof window !== 'undefined' && window.matchMedia) {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handleSystemThemeChange = (e: MediaQueryListEvent | MediaQueryList) => {
    const currentPreference = useThemeStore.getState().preference;
    if (currentPreference === 'system') {
      const newResolved: ResolvedTheme = e.matches ? 'dark' : 'light';
      applyThemeToDOM(newResolved);
      useThemeStore.setState({ resolvedTheme: newResolved });
    }
  };

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', handleSystemThemeChange);
  } else if (typeof (mediaQuery as any).addListener === 'function') {
    // Safari / older browser fallback
    (mediaQuery as any).addListener(handleSystemThemeChange);
  }
}
