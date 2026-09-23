/**
 * FILE: reveal.jsx
 * PURPOSE: Operon-style scroll-reveal primitives — IntersectionObserver-driven
 *          fade/rise (or lateral) entrance with optional per-item stagger.
 * CONNECTS TO: src/main.css (.vd-reveal, .vd-reveal-flat, --reveal-delay);
 *              consumed by dashboards, lists and card grids.
 *
 * - Reveal     → fade + 14px rise (or ±22px via `from`), replayable via `once={false}`
 * - RevealFlat → opacity-only; safe inside <tr>/elements that can't transform
 * - spotlightMove → onMouseMove handler setting --mx/--my for .vd-spotlight
 */

import { useEffect, useRef, useState } from 'react';
import { cn } from './cn';

function useReveal(once) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [once]);

  return { ref, visible };
}

/**
 * Scroll-triggered entrance wrapper.
 * @param {object} props
 * @param {string} [props.as]       - element tag ('div' default, 'li', 'section'...)
 * @param {number} [props.delay]    - stagger delay in ms
 * @param {boolean} [props.once]    - true = animate once; false = replay on re-entry
 * @param {'up'|'left'|'right'} [props.from] - entrance direction
 */
export function Reveal({ as: Tag = 'div', delay = 0, once = true, from = 'up', className, children, ...rest }) {
  const { ref, visible } = useReveal(once);
  return (
    <Tag
      ref={ref}
      className={cn(
        'vd-reveal',
        from === 'left' && 'vd-from-left',
        from === 'right' && 'vd-from-right',
        visible && 'reveal-visible',
        className
      )}
      style={{ '--reveal-delay': `${delay}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Opacity-only reveal — for <tr> and other transform-hostile elements. */
export function RevealFlat({ as: Tag = 'div', delay = 0, once = true, className, children, ...rest }) {
  const { ref, visible } = useReveal(once);
  return (
    <Tag
      ref={ref}
      className={cn('vd-reveal-flat', visible && 'reveal-visible', className)}
      style={{ '--reveal-delay': `${delay}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** onMouseMove handler — positions the .vd-spotlight radial highlight. */
export function spotlightMove(event) {
  const rect = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty('--mx', `${event.clientX - rect.left}px`);
  event.currentTarget.style.setProperty('--my', `${event.clientY - rect.top}px`);
}
