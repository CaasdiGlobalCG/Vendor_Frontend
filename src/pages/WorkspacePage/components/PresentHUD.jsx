import React, { useEffect, useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, LayoutGrid, X } from 'lucide-react';

const HIDE_AFTER_MS = 2500;

/**
 * Control bar for Present mode. It owns the keyboard shortcuts for the
 * presentation (so they exist exactly while presenting) and fades out when the
 * pointer is idle, so it never sits in front of the content.
 *
 *   Right / Down / Space / PageDown   next slide
 *   Left / Up / PageUp                previous slide (back to the overview)
 *   Home / End                        first / last slide
 *   O                                 overview
 *   Esc                               exit
 */
const PresentHUD = ({ index, total, label, onNext, onPrev, onFirst, onLast, onOverview, onExit }) => {
  const [visible, setVisible] = useState(true);
  const [hintVisible, setHintVisible] = useState(true);
  const hideTimer = useRef(null);

  const wake = () => {
    setVisible(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setVisible(false), HIDE_AFTER_MS);
  };

  useEffect(() => {
    wake();
    const hint = setTimeout(() => setHintVisible(false), 4000);
    window.addEventListener('mousemove', wake);
    window.addEventListener('pointerdown', wake);
    return () => {
      clearTimeout(hideTimer.current);
      clearTimeout(hint);
      window.removeEventListener('mousemove', wake);
      window.removeEventListener('pointerdown', wake);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      // Never swallow shortcuts meant for a field the presenter is typing in
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || event.target?.isContentEditable) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const actions = {
        ArrowRight: onNext,
        ArrowDown: onNext,
        PageDown: onNext,
        ' ': onNext,
        ArrowLeft: onPrev,
        ArrowUp: onPrev,
        PageUp: onPrev,
        Home: onFirst,
        End: onLast,
        o: onOverview,
        O: onOverview,
        Escape: onExit,
      };
      const action = actions[event.key];
      if (!action) return;
      event.preventDefault();
      event.stopPropagation(); // keep canvas shortcuts (Delete, Space-to-pan ...) out of it
      action();
      wake();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [onNext, onPrev, onFirst, onLast, onOverview, onExit]);

  const button =
    'inline-flex h-9 w-9 items-center justify-center rounded-full text-ink transition-colors ' +
    'hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-info/50 ' +
    'disabled:opacity-35 disabled:hover:bg-transparent';

  const position = total === 0 ? 'Nothing to present' : index < 0 ? 'Overview' : `${index + 1} / ${total}`;

  return (
    <>
      {hintVisible && (
        <div
          role="status"
          className="pointer-events-none absolute left-1/2 top-6 z-[1100] -translate-x-1/2 rounded-full bg-ink/85 px-4 py-2 text-xs text-paper shadow-pop"
          style={{ color: 'rgb(var(--cta-text))', background: 'rgb(var(--text-primary) / 0.85)' }}
        >
          Use ← → to move between slides · O for overview · Esc to exit
        </div>
      )}

      <div
        role="toolbar"
        aria-label="Presentation controls"
        className={`absolute bottom-6 left-1/2 z-[1100] flex -translate-x-1/2 items-center gap-1 rounded-full border border-line bg-surface px-2 py-1.5 shadow-modal transition-opacity duration-300 ${
          visible ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <button type="button" className={button} onClick={onPrev} disabled={index < 0} aria-label="Previous slide" title="Previous (←)">
          <ChevronLeft className="h-5 w-5" />
        </button>

        <button type="button" className={button} onClick={onOverview} disabled={index < 0} aria-label="Overview" title="Overview (O)">
          <LayoutGrid className="h-4 w-4" />
        </button>

        <div className="min-w-[8rem] max-w-[16rem] px-3 text-center" aria-live="polite">
          <div className="text-xs font-semibold tabular-nums text-ink">{position}</div>
          {index >= 0 && label && <div className="truncate text-[11px] text-dim">{label}</div>}
        </div>

        <button type="button" className={button} onClick={onNext} disabled={total === 0 || index >= total - 1} aria-label="Next slide" title="Next (→)">
          <ChevronRight className="h-5 w-5" />
        </button>

        <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />

        <button type="button" className={button} onClick={onExit} aria-label="Exit presentation" title="Exit (Esc)">
          <X className="h-4 w-4" />
        </button>
      </div>
    </>
  );
};

export default PresentHUD;
