// ============================================================
// VeniLearn LMS - Global Theme Management Store
// Supports: Light and Dark themes with LocalStorage persistence,
// zero-flicker initialization, and instant DOM updates.
// ============================================================

import { create } from 'zustand';

export type ThemePreference = 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'venilearn_theme_preference';

// Helper to apply the resolved theme to the DOM
export const applyThemeToDOM = (theme: ResolvedTheme): void => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
};

// Get stored preference or default to 'light' (with Deep Navy Sidebar)
export const getStoredThemePreference = (): ThemePreference => {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    // If legacy 'system' was stored, normalize to 'light'
    if (stored === 'system') {
      localStorage.setItem(THEME_STORAGE_KEY, 'light');
      return 'light';
    }
  } catch (err) {
    console.warn('Failed to read theme preference from localStorage:', err);
  }
  return 'light';
};

interface ThemeState {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setTheme: (pref: ThemePreference) => void;
  toggleTheme: () => void;
}

// Read initial preference and compute initial resolved theme
const initialPreference = getStoredThemePreference();
const initialResolved = initialPreference;

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

    applyThemeToDOM(pref);
    set({ preference: pref, resolvedTheme: pref });
  },

  toggleTheme: () => {
    const current = get().preference;
    const next: ThemePreference = current === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  }
}));

// Listen for theme preference changes across browser tabs
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === THEME_STORAGE_KEY && event.newValue) {
      const newPref = (event.newValue === 'dark' ? 'dark' : 'light') as ThemePreference;
      applyThemeToDOM(newPref);
      useThemeStore.setState({ preference: newPref, resolvedTheme: newPref });
    }
  });
}
