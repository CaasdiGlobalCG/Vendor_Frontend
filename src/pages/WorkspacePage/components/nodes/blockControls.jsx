import React, { useEffect, useRef, useState } from 'react';
import { labelClasses, inputClasses } from '../ui/controlStyles';
import { safeHttpUrl } from '../../utils/blockElements';

/**
 * Text field that keeps what you type locally and saves on blur / Enter, so a
 * sentence is one update to collaborators instead of one per keystroke.
 */
export const CommitField = ({ value, onCommit, multiline = false, className = '', ...rest }) => {
  const [draft, setDraft] = useState(value ?? '');
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) setDraft(value ?? '');
  }, [value]);

  const commit = () => {
    focusedRef.current = false;
    if (draft !== (value ?? '')) onCommit(draft);
  };

  const props = {
    value: draft,
    onChange: (e) => setDraft(e.target.value),
    onFocus: () => { focusedRef.current = true; },
    onBlur: commit,
    onKeyDown: (e) => {
      e.stopPropagation(); // typing must not trigger canvas shortcuts (Delete, Backspace ...)
      if (e.key === 'Enter' && !multiline) e.currentTarget.blur();
      if (e.key === 'Escape') { setDraft(value ?? ''); e.currentTarget.blur(); }
    },
    className,
    ...rest,
  };
  return multiline ? <textarea {...props} /> : <input {...props} />;
};

export const Row = ({ label, children }) => (
  <label className="block">
    <span className={labelClasses}>{label}</span>
    {children}
  </label>
);

export const Segment = ({ options, value, onChange, label }) => (
  <div role="group" aria-label={label} className="flex rounded-lg border border-line p-0.5 bg-surface-hover/40">
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        title={o.title}
        aria-pressed={value === o.value}
        onClick={() => onChange(o.value)}
        className={`flex-1 inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-medium transition-colors ${
          value === o.value ? 'bg-surface text-ink shadow-node' : 'text-dim hover:text-ink'
        }`}
      >
        {o.content ?? o.title}
      </button>
    ))}
  </div>
);


/** Web address field: saves a cleaned-up http(s) address, or says why it cannot. */
export const UrlField = ({ value, onCommit, placeholder = 'https://' }) => {
  const [error, setError] = useState(false);
  return (
    <>
      <CommitField
        value={value}
        placeholder={placeholder}
        inputMode="url"
        aria-invalid={error || undefined}
        className={inputClasses({ invalid: error })}
        onCommit={(draft) => {
          if (!draft.trim()) { setError(false); onCommit(''); return; }
          const safe = safeHttpUrl(draft);
          setError(!safe);
          if (safe) onCommit(safe);
        }}
      />
      {error && <span className="mt-1 block text-xs text-danger">Enter a valid web address, like https://example.com</span>}
    </>
  );
};
