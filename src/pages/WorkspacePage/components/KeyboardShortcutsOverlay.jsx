import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const shortcuts = [
  { category: 'Layout', items: [
    { keys: ['Ctrl', 'Shift', 'H'], desc: 'Toggle focus mode' },
    { keys: ['Ctrl', 'Shift', 'L'], desc: 'Pin/unpin left panel' },
    { keys: ['Ctrl', 'Shift', 'R'], desc: 'Pin/unpin right panel' },
    { keys: ['Ctrl', 'Shift', '1'], desc: 'Fit canvas to view' },
  ]},
  { category: 'General', items: [
    { keys: ['Ctrl', 'K'], desc: 'Open command palette' },
    { keys: ['?'], desc: 'Show keyboard shortcuts' },
    { keys: ['Esc'], desc: 'Close panel / overlay' },
  ]},
  { category: 'Canvas', items: [
    { keys: ['Scroll'], desc: 'Zoom in / out' },
    { keys: ['Right-click drag'], desc: 'Pan canvas' },
    { keys: ['Space + drag'], desc: 'Pan canvas (alt)' },
    { keys: ['Delete'], desc: 'Remove selected element' },
  ]},
];

const KeyboardShortcutsOverlay = ({ isOpen, onClose }) => {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={onClose}>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        ref={panelRef}
        className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-label="Keyboard shortcuts"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[400px] overflow-y-auto p-5 space-y-5">
          {shortcuts.map(group => (
            <div key={group.category}>
              <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{group.category}</h3>
              <div className="space-y-1.5">
                {group.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <span className="text-sm text-gray-700">{item.desc}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((key, ki) => (
                        <React.Fragment key={ki}>
                          {ki > 0 && <span className="text-gray-300 text-xs">+</span>}
                          <kbd className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-medium text-gray-600 bg-gray-100 rounded border border-gray-200 min-w-[24px] justify-center">
                            {key}
                          </kbd>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-gray-100 text-[10px] text-gray-400 text-center">
          Press <kbd className="px-1 py-0.5 bg-gray-100 rounded border border-gray-200">?</kbd> anytime to show this
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

export default KeyboardShortcutsOverlay;
