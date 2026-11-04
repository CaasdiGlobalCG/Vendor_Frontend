import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { applyTheme } from '../../../components/ui/theme';
import { useIsDarkMode } from '../hooks/useIsDarkMode';

/**
 * Light / dark switch for the workspace top bar. Uses the app-wide theme
 * helpers (same `.dark` class on <html>, same saved preference as the
 * dashboard's toggle), and stays in sync if the theme is changed elsewhere.
 */
const WorkspaceThemeToggle = () => {
  const isDark = useIsDarkMode();
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <button
      type="button"
      onClick={() => applyTheme(isDark ? 'light' : 'dark')}
      className="ws-icon-btn"
      title={label}
      aria-label={label}
      aria-pressed={isDark}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
};

export default WorkspaceThemeToggle;
