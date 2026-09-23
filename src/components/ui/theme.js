// ============================================================
// FILE: components/ui/theme.js
// PURPOSE: Single place that knows how light/dark mode is applied.
//          Tailwind is configured with `darkMode: 'class'`, so adding or
//          removing `.dark` on <html> flips every token (canvas, surface,
//          ink, brand, …) across the whole app at once.
// CONNECTS TO: index.html inline init script (applies the same logic
//              before React mounts — prevents a light-mode flash),
//              theme-toggle.jsx (the user-facing control).
// ============================================================

// 'dark' | 'light' in storage; missing value = follow the OS preference.
const STORAGE_KEY = 'theme';

/**
 * Returns the theme the app should boot with.
 * Default is LIGHT — dark mode only activates after the user toggles it
 * (the choice is then persisted via localStorage).
 */
export function getInitialTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    // Storage unavailable (private mode, SSR) — fall through to light.
  }
  return 'light';
}

/**
 * Applies a theme by toggling `.dark` on <html> and persisting the choice.
 * @param {'light'|'dark'} theme
 */
export function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Non-persisting environments still get the visual switch.
  }
  return theme;
}

/** Flips the current theme and returns the new value. */
export function toggleTheme() {
  const next = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
  return applyTheme(next);
}
