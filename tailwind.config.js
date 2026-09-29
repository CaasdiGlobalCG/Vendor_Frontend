/** @type {import('tailwindcss').Config} */

// Caasdi Monochrome Design System
// All colors resolve to CSS vars in src/main.css — edit tokens there, not here.
// Legacy names (primary/secondary/muted/accent/destructive/border/background/
// foreground/card/popover/custom-*/gradient-*/line-*) are kept as aliases so
// existing classes keep working while migrating to the new token names.

const v = (name) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── New tokens (use these going forward) ──────────────
        canvas: v('--canvas-bg'),
        surface: {
          DEFAULT: v('--surface-card'),
          hover: v('--surface-hover'),
        },
        line: v('--border-subtle'),
        ink: v('--text-primary'),
        dim: v('--text-muted'),
        cta: {
          DEFAULT: v('--cta-action'),
          foreground: v('--cta-text'),
        },
        brand: {
          DEFAULT: v('--brand'),
          foreground: v('--brand-foreground'),
        },
        success: v('--status-success'),
        danger: v('--status-danger'),
        warning: v('--status-warning'),
        info: v('--status-info'),

        // ── Legacy aliases (do not use in new code) ───────────
        // NOTE: old accent aliases (primary/violetCustom/magentaCustom/gradient-*)
        // resolve to the monochrome CTA pair — teal is reserved for nav only.
        background: v('--canvas-bg'),
        foreground: v('--text-primary'),
        card: {
          DEFAULT: v('--surface-card'),
          foreground: v('--text-primary'),
        },
        popover: {
          DEFAULT: v('--surface-card'),
          foreground: v('--text-primary'),
        },
        primary: {
          DEFAULT: v('--cta-action'),
          foreground: v('--cta-text'),
        },
        secondary: {
          DEFAULT: v('--surface-hover'),
          foreground: v('--text-primary'),
        },
        muted: {
          DEFAULT: v('--surface-hover'),
          foreground: v('--text-muted'),
        },
        accent: {
          DEFAULT: v('--surface-hover'),
          foreground: v('--text-primary'),
        },
        destructive: {
          DEFAULT: v('--status-danger'),
          foreground: 'rgb(255 255 255 / <alpha-value>)',
        },
        border: v('--border-subtle'),
        input: v('--border-subtle'),
        ring: v('--text-primary'),
        'custom-bg': v('--canvas-bg'),
        'custom-text': v('--text-primary'),
        'gradient-from': v('--cta-action'),
        'gradient-to': v('--cta-action'),
        'line-active': v('--text-primary'),
        'line-inactive': v('--border-subtle'),
        'line-inactive-darker': v('--text-muted'),

        // ── Operon brand palette (BRAND.md) ───────────────────
        // Namespaced `op-*` on purpose: the bare names `ink` / `paper` already
        // exist above as THEME tokens (they flip with light/dark), so reusing
        // them here would silently override app-wide colours. The brand palette
        // is a fixed monochrome, so it gets its own namespace.
        'op-ink': '#000000',
        'op-paper': '#FFFFFF',
        'op-cloud': '#F0F0F0',
        'op-ink-70': 'rgba(0,0,0,0.70)',
        'op-ink-55': 'rgba(0,0,0,0.55)',
        'op-ink-40': 'rgba(0,0,0,0.40)',
        'op-ink-30': 'rgba(0,0,0,0.30)',
        'op-ink-14': 'rgba(0,0,0,0.14)',
        'op-ink-08': 'rgba(0,0,0,0.08)',
        'op-ink-04': 'rgba(0,0,0,0.04)',
        'op-paper-70': 'rgba(255,255,255,0.70)',
        'op-paper-55': 'rgba(255,255,255,0.55)',
        'op-paper-30': 'rgba(255,255,255,0.30)',
        'op-paper-14': 'rgba(255,255,255,0.14)',
        'op-paper-08': 'rgba(255,255,255,0.08)',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        poppins: ['Inter', 'sans-serif'], // alias — Poppins removed, resolves to Inter
        montserrat: ['Inter', 'sans-serif'], // alias — Montserrat removed
        // Brand roles (BRAND.md §2): display = Poppins, mono = JetBrains Mono.
        display: ['Poppins', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        // Brand type scale (BRAND.md §2). Additive names only — no overrides
        // of Tailwind defaults, so existing pages are unaffected.
        'mono-xs': ['10px', { lineHeight: '14px', letterSpacing: '0.08em' }],
        mono: ['11px', { lineHeight: '14px', letterSpacing: '0.08em' }],
        'mono-lg': ['12px', { lineHeight: '16px', letterSpacing: '0.06em' }],
        body: ['17px', { lineHeight: '28px' }],
        lead: ['20px', { lineHeight: '32px' }],
        h4: ['22px', { lineHeight: '30px', letterSpacing: '-0.01em' }],
        h3: ['32px', { lineHeight: '40px', letterSpacing: '-0.015em' }],
        h2: ['44px', { lineHeight: '48px', letterSpacing: '-0.025em' }],
        'h2-lg': ['64px', { lineHeight: '60px', letterSpacing: '-0.03em' }],
        h1: ['48px', { lineHeight: '52px', letterSpacing: '-0.03em' }],
        'h1-lg': ['72px', { lineHeight: '68px', letterSpacing: '-0.035em' }],
      },
      maxWidth: {
        // NOTE: `prose` is deliberately NOT set here — Tailwind ships
        // max-w-prose (65ch) and overriding it would shift existing pages.
        content: '1200px',
        narrow: '880px',
        measure: '58ch',
      },
      transitionTimingFunction: {
        signal: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
      },
      transitionDuration: {
        120: '120ms',
        180: '180ms',
        240: '240ms',
        320: '320ms',
        440: '440ms',
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: 'var(--radius)',
        xl: '12px',
      },
      boxShadow: {
        pop: '0 4px 12px rgba(0,0,0,0.08)',
        modal: '0 8px 32px rgba(0,0,0,0.12)',
      },
      animation: {
        drawLine: 'drawLine 1.5s cubic-bezier(0.8, 0, 1, 1) forwards',
        modalFadeIn: 'modalFadeIn 0.3s ease-in-out forwards',
        fadeSlideIn: 'fadeSlideIn 0.8s ease-out forwards',
        fadeSlideInRight: 'fadeSlideInRight 0.8s ease-out forwards',
        drawHorizontal: 'drawHorizontal 2.5s ease-out forwards',
        drawHorizontalRight: 'drawHorizontalRight 2.5s ease-out forwards',
        drawVertical: 'drawVertical 2.5s ease-out 2.5s forwards',
        'fade-in': 'uiFadeIn 0.2s ease-out forwards',
        'slide-up': 'uiSlideUp 0.25s ease-out forwards',
        'scale-in': 'uiScaleIn 0.2s ease-out forwards',
        shimmer: 'uiShimmer 1.5s linear infinite',
      },
      keyframes: {
        drawLine: {
          '0%': { clipPath: 'inset(0 100% 0 0)' },
          '100%': { clipPath: 'inset(0 0 0 0)' },
        },
        modalFadeIn: {
          from: { opacity: '0', transform: 'translateY(-20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeSlideIn: {
          from: { opacity: '0', transform: 'translateX(-50px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        fadeSlideInRight: {
          from: { opacity: '0', transform: 'translateX(50px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        drawHorizontal: {
          '0%': { width: '0', opacity: '0' },
          '10%': { opacity: '1' },
          '100%': { width: '79%', opacity: '1' },
        },
        drawHorizontalRight: {
          '0%': { width: '0', opacity: '0' },
          '10%': { opacity: '1' },
          '100%': { width: '80%', opacity: '1' },
        },
        drawVertical: {
          '0%': { opacity: '0', transform: 'scaleY(0)' },
          '10%': { opacity: '1' },
          '100%': { opacity: '1', transform: 'scaleY(1)' },
        },
        uiFadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        uiSlideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        uiScaleIn: {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        uiShimmer: {
          from: { backgroundPosition: '200% 0' },
          to: { backgroundPosition: '-200% 0' },
        },
      },
      screens: {
        xs: '320px',
        sm: '480px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
      },
    },
  },
  plugins: [],
}
