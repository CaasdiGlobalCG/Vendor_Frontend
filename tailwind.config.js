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
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        poppins: ['Inter', 'sans-serif'], // alias — Poppins removed, resolves to Inter
        montserrat: ['Inter', 'sans-serif'], // alias — Montserrat removed
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
