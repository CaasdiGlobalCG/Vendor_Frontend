/**
 * FILE: cn.js
 * PURPOSE: Merge conditional Tailwind class names into one string.
 * CONNECTS TO: Every component in src/components/ui/.
 *
 * Tiny dependency-free replacement for clsx/classnames so the UI kit
 * works without adding packages.
 */

/**
 * Join class names, dropping falsy values.
 * @param {...(string|false|null|undefined)} classes - Class fragments.
 * @returns {string} Single space-joined class string.
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}
