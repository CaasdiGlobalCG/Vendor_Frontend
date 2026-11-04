import { useEffect, useState } from 'react';

const readIsDark = () =>
  typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

/**
 * True while the app is in dark mode. Follows the `.dark` class on <html>, so
 * it updates whichever toggle changes the theme. Use it for the few things CSS
 * variables cannot reach (e.g. SVG presentation attributes, canvas-library
 * props that take a plain colour string).
 */
export const useIsDarkMode = () => {
  const [isDark, setIsDark] = useState(readIsDark);

  useEffect(() => {
    if (typeof MutationObserver === 'undefined') return undefined;
    setIsDark(readIsDark());
    const observer = new MutationObserver(() => setIsDark(readIsDark()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return isDark;
};

export default useIsDarkMode;
