import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send } from 'lucide-react';

/**
 * MentionInput — A textarea with @mention autocomplete for workspace collaborators.
 *
 * Props:
 *   collaborators - Array of { vendorId, name, email, avatar }
 *   onSubmit(text, mentionedUserIds) - Called when user hits submit
 *   placeholder - Optional placeholder text
 *   autoFocus - Optional auto-focus on mount
 *   disabled - Disable input
 */
const MentionInput = ({ collaborators = [], onSubmit, placeholder = 'Add a comment...', autoFocus = false, disabled = false }) => {
  const [text, setText] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const [cursorPos, setCursorPos] = useState(0);
  const textareaRef = useRef(null);
  const menuRef = useRef(null);

  // Filter collaborators by query
  const filtered = collaborators.filter(c => {
    const q = mentionQuery.toLowerCase();
    return (c.name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q);
  }).slice(0, 6);

  // Detect @mention trigger
  const handleChange = (e) => {
    const val = e.target.value;
    const pos = e.target.selectionStart;
    setText(val);
    setCursorPos(pos);

    // Look back from cursor for an "@" trigger
    const before = val.slice(0, pos);
    const atMatch = before.match(/@(\w*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setShowMentions(true);
      setMentionIndex(0);
    } else {
      setShowMentions(false);
    }
  };

  // Insert mention into text
  const insertMention = useCallback((user) => {
    const before = text.slice(0, cursorPos);
    const after = text.slice(cursorPos);
    const atIdx = before.lastIndexOf('@');
    const newText = before.slice(0, atIdx) + `@${user.name} ` + after;
    setText(newText);
    setShowMentions(false);
    // Focus back and set cursor
    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = atIdx + user.name.length + 2;
        textareaRef.current.focus();
        textareaRef.current.selectionStart = newPos;
        textareaRef.current.selectionEnd = newPos;
      }
    }, 0);
  }, [text, cursorPos]);

  // Keyboard navigation in mention dropdown
  const handleKeyDown = (e) => {
    e.stopPropagation();
    if (showMentions && filtered.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(i => (i + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(i => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filtered[mentionIndex]);
        return;
      } else if (e.key === 'Escape') {
        setShowMentions(false);
      }
    }
    // Ctrl/Cmd+Enter to submit
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Extract mentioned user IDs from text
  const extractMentionedIds = (txt) => {
    const ids = [];
    const regex = /@([\w\s.]+?)(?=\s@|\s|$)/g;
    let match;
    while ((match = regex.exec(txt)) !== null) {
      const name = match[1].trim();
      const user = collaborators.find(c => c.name === name);
      if (user) ids.push(user.vendorId);
    }
    return [...new Set(ids)];
  };

  const handleSubmit = () => {
    if (!text.trim() || disabled) return;
    const mentionedIds = extractMentionedIds(text);
    onSubmit(text.trim(), mentionedIds);
    setText('');
    setShowMentions(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMentions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <div className="flex items-end space-x-1.5">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
          placeholder={placeholder}
          autoFocus={autoFocus}
          disabled={disabled}
          rows={Math.max(1, Math.min(4, text.split('\n').length))}
          className="flex-1 text-xs leading-relaxed bg-surface border border-line rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-info focus:border-info px-2.5 py-1.5 placeholder-dim text-ink disabled:bg-canvas disabled:text-dim"
          style={{ minHeight: '32px', maxHeight: '100px', overflow: 'auto' }}
        />
        <button
          onClick={(e) => { e.stopPropagation(); handleSubmit(); }}
          disabled={!text.trim() || disabled}
          className="flex-shrink-0 w-7 h-7 rounded-full bg-info hover:bg-info disabled:bg-surface-hover text-white flex items-center justify-center transition-colors  mb-0.5"
          title="Post comment (Ctrl+Enter)"
        >
          <Send className="w-3.5 h-3.5" style={{ transform: 'rotate(-45deg)', marginLeft: '1px' }} />
        </button>
      </div>

      {/* @mention autocomplete dropdown */}
      {showMentions && filtered.length > 0 && (
        <div className="absolute bottom-full left-0 mb-1 w-full max-w-[260px] bg-surface border border-line rounded-lg shadow-xl z-50 py-1 max-h-[180px] overflow-y-auto">
          <div className="px-2 py-1 text-[10px] font-semibold text-dim uppercase tracking-wide">Collaborators</div>
          {filtered.map((user, idx) => (
            <button
              key={user.vendorId || user.email}
              onClick={(e) => { e.stopPropagation(); insertMention(user); }}
              className={`w-full px-2.5 py-1.5 text-left flex items-center space-x-2 text-xs transition-colors ${
                idx === mentionIndex ? 'bg-info/10 text-info' : 'text-ink hover:bg-canvas'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                {(user.name || user.email || '?').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{user.name || 'Unknown'}</div>
                <div className="text-[10px] text-dim truncate">{user.email}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MentionInput;
