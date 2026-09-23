// ============================================================
// FILE: components/ui/theme-toggle.jsx
// PURPOSE: Sun/Moon button that flips the app between light and dark mode.
//          Icons invert with the theme: Moon shows in light mode (click →
//          dark), Sun shows in dark mode (click → light).
// CONNECTS TO: theme.js (applyTheme/getInitialTheme), Header.jsx,
//              tailwind `dark:` variants via the `.dark` class on <html>.
// ============================================================

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { applyTheme, getInitialTheme } from './theme';
import { cn } from './cn';

/**
 * ThemeToggle — icon button that switches the `.dark` class on <html>.
 * Reads the saved/system theme on mount so the icon always matches reality.
 */
export function ThemeToggle({ className }) {
  const [theme, setTheme] = useState('light');

  // Sync icon with the theme chosen by the index.html init script.
  useEffect(() => {
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : getInitialTheme());
  }, []);

  const handleToggle = () => setTheme(applyTheme(theme === 'dark' ? 'light' : 'dark'));

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-lg text-dim',
        'hover:bg-surface-hover hover:text-ink transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink',
        className
      )}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

export default ThemeToggle;
