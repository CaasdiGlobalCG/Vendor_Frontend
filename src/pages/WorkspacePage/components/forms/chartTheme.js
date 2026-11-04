import { useEffect, useState } from 'react';

/**
 * Chart colours come from the design tokens (--chart-1..6 and the surface /
 * text tokens in main.css). SVG presentation attributes cannot use CSS
 * variables, so they are resolved to concrete colours here and re-resolved
 * whenever the app switches between light and dark.
 */

const FALLBACK = {
  series: ['37 99 235', '16 185 129', '245 158 11', '139 92 246', '236 72 153', '14 165 233'],
  muted: '115 115 115',
  grid: '219 219 219',
  ink: '0 0 0',
  paper: '255 255 255',
  surface: '255 255 255',
  hover: '240 240 240',
};

const rgb = (triplet) => `rgb(${triplet})`;

const readVar = (name, fallback) => {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
};

export const readChartTheme = () => ({
  series: FALLBACK.series.map((fallback, i) => rgb(readVar(`--chart-${i + 1}`, fallback))),
  muted: rgb(readVar('--text-muted', FALLBACK.muted)),
  grid: rgb(readVar('--border-subtle', FALLBACK.grid)),
  ink: rgb(readVar('--text-primary', FALLBACK.ink)),
  paper: rgb(readVar('--cta-text', FALLBACK.paper)),
  surface: rgb(readVar('--surface-card', FALLBACK.surface)),
  hover: rgb(readVar('--surface-hover', FALLBACK.hover)),
});

/** Theme object that updates when the `dark` class on <html> toggles. */
export const useChartTheme = () => {
  const [theme, setTheme] = useState(readChartTheme);

  useEffect(() => {
    if (typeof MutationObserver === 'undefined') return undefined;
    const observer = new MutationObserver(() => setTheme(readChartTheme()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return theme;
};

// Colours older charts were saved with (the previous hard-coded defaults).
const LEGACY_DEFAULTS = new Set(['#3b82f6', '#ef4444', '#10b981', '#f59e0b']);

/**
 * Colour for series point `index`. Charts still on the old hard-coded defaults
 * (or with no colours) follow the theme palette; colours a user picked
 * themselves are kept as saved.
 */
export const pickSeriesColors = (savedColors, theme, count) => {
  const saved = Array.isArray(savedColors) ? savedColors.filter(Boolean) : [];
  const customised = saved.some((c) => !LEGACY_DEFAULTS.has(String(c).toLowerCase()));
  return {
    customised,
    colors: Array.from({ length: Math.max(count, 1) }, (_, i) =>
      customised && saved[i] ? saved[i] : theme.series[i % theme.series.length]
    ),
  };
};
