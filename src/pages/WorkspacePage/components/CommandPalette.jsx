import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, Command, ArrowRight, Keyboard, Eye, EyeOff, Maximize2, Layout, ZoomIn, Grid3X3, FileText, PanelLeft, PanelRight, Settings, HelpCircle } from 'lucide-react';

const CommandPalette = ({ isOpen, onClose, commands = [] }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      cmd => cmd.label.toLowerCase().includes(q) ||
             cmd.category?.toLowerCase().includes(q) ||
             cmd.keywords?.some(k => k.toLowerCase().includes(q))
    );
  }, [query, commands]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.children[selectedIndex];
      selected?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const executeCommand = useCallback((cmd) => {
    if (cmd?.action) {
      onClose();
      // Small delay to let the palette close animation happen
      setTimeout(() => cmd.action(), 50);
    }
  }, [onClose]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      executeCommand(filtered[selectedIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [filtered, selectedIndex, executeCommand, onClose]);

  if (!isOpen) return null;

  // Group commands by category
  const grouped = filtered.reduce((acc, cmd) => {
    const cat = cmd.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(cmd);
    return acc;
  }, {});

  // Flatten for index tracking
  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-surface rounded-xl shadow-2xl border border-line overflow-hidden animate-in"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-label="Command palette"
      >
        {/* Search input */}
        <div className="flex items-center px-4 border-b border-line">
          <Search className="w-4 h-4 text-dim shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="flex-1 px-3 py-3.5 text-sm bg-transparent border-none outline-none placeholder-dim"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium text-dim bg-surface-hover rounded border border-line">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[340px] overflow-y-auto py-2" role="listbox">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-dim">
              No commands found for "{query}"
            </div>
          ) : (
            Object.entries(grouped).map(([category, cmds]) => (
              <div key={category}>
                <div className="px-4 pt-2 pb-1 text-[10px] font-semibold text-dim uppercase tracking-wider">
                  {category}
                </div>
                {cmds.map(cmd => {
                  flatIndex++;
                  const idx = flatIndex;
                  return (
                    <button
                      key={cmd.id}
                      role="option"
                      aria-selected={idx === selectedIndex}
                      className={`w-full flex items-center px-4 py-2 text-left text-sm transition-colors ${
                        idx === selectedIndex
                          ? 'bg-info/10 text-info'
                          : 'text-ink hover:bg-canvas'
                      }`}
                      onClick={() => executeCommand(cmd)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                    >
                      {cmd.icon && (
                        <span className={`mr-3 ${idx === selectedIndex ? 'text-info' : 'text-dim'}`}>
                          {cmd.icon}
                        </span>
                      )}
                      <span className="flex-1 truncate">{cmd.label}</span>
                      {cmd.shortcut && (
                        <kbd className="ml-2 hidden sm:inline-flex items-center gap-0.5 text-[10px] font-medium text-dim">
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-line flex items-center gap-4 text-[10px] text-dim">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-surface-hover rounded border border-line">↑↓</kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-surface-hover rounded border border-line">↵</kbd> select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-surface-hover rounded border border-line">esc</kbd> close
          </span>
        </div>
      </div>

      <style>{`
        @keyframes animate-in-up {
          from { opacity: 0; transform: translateY(-8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-in {
          animation: animate-in-up 0.15s ease-out;
        }
      `}</style>
    </div>
  );
};

export default CommandPalette;
