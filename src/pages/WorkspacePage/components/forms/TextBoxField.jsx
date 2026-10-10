import React, { useState, useEffect } from 'react';
import { Edit2 } from 'lucide-react';

/**
 * Static Text Box — a bordered display box that holds text.
 * Unlike the Input field (an editable form control), this renders
 * content as display text and enters edit mode on double-click.
 * Parent owns the value and persistence (inputValue/fieldLabel autosave).
 */
const TextBoxField = ({ value, label, onTextChange, onLabelChange, locked, editSignal }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');

  // Menu "Edit" → editSignal increments → enter edit mode
  useEffect(() => {
    if (editSignal > 0 && !locked) {
      setDraft(value || '');
      setIsEditing(true);
    }
  }, [editSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  const commit = () => {
    setIsEditing(false);
    if (draft !== value) onTextChange?.(draft);
  };

  return (
    <div
      className={`border-2 rounded-lg p-3 min-h-[80px] transition-colors ${
        locked ? 'border-line bg-canvas' : 'border-line bg-surface hover:border-info/40'
      }`}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (!locked) {
          setDraft(value || '');
          setIsEditing(true);
        }
      }}
    >
      {isEditing && !locked ? (
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Escape') setIsEditing(false);
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) commit();
          }}
          className="w-full h-24 p-1 text-sm text-ink bg-transparent resize-none focus:outline-none"
          placeholder="Type text for this box…"
        />
      ) : (
        <>
          <p className={`text-sm whitespace-pre-wrap break-words ${value ? 'text-ink' : 'text-dim italic'}`}>
            {value || 'Double-click to add text'}
          </p>
          {!locked && (
            <div className="mt-2 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
              <Edit2 className="w-3 h-3 text-dim" />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TextBoxField;
