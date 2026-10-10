import React, { useState, useEffect, useRef } from 'react';
import { X, UserCheck, Users, Link2, Save, Trash2, EyeOff, Globe, Crosshair } from 'lucide-react';

/**
 * FieldAccessPanel — "who should answer" configuration for a form/choice element.
 *
 * Writes a `fieldAccess` object onto the node:
 *   { assignees[], answerMode, reason, relatedNodeId, visibility, createdBy, createdAt }
 *
 * Visibility:
 *   'restricted' (default) → assignees + the element's creator + PM
 *   'everyone'             → anyone with canvas access
 */
const FieldAccessPanel = ({
  access,
  collaborators = [],
  elements = [],
  allowPoll = false,
  sourceNodeId,
  sourceLabel,
  onSave,
  onClear,
  onClose
}) => {
  const [mode, setMode] = useState(access?.answerMode === 'poll' ? 'poll' : 'single');
  const [selected, setSelected] = useState(() => access?.assignees || []);
  const [reason, setReason] = useState(access?.reason || '');
  const [relatedNodeId, setRelatedNodeId] = useState(access?.relatedNodeId || '');
  const [visibility, setVisibility] = useState(access?.visibility || 'restricted');
  const [pickMode, setPickMode] = useState(false);
  const [pickedName, setPickedName] = useState('');
  const pickModeRef = useRef(false);
  pickModeRef.current = pickMode;

  // Pick-on-canvas: arm link mode, receive the click, or release on unmount
  useEffect(() => {
    const onPicked = (event) => {
      if (event.detail?.sourceNodeId !== sourceNodeId) return;
      setRelatedNodeId(event.detail.targetId || '');
      setPickedName(event.detail.targetName || '');
      setPickMode(false);
    };
    const onModeChange = (event) => {
      if (event.detail?.sourceNodeId === sourceNodeId && event.detail?.active === false) {
        setPickMode(false);
      }
    };
    document.addEventListener('elementLinkPicked', onPicked);
    document.addEventListener('activateElementLinkMode', onModeChange);
    return () => {
      document.removeEventListener('elementLinkPicked', onPicked);
      document.removeEventListener('activateElementLinkMode', onModeChange);
      // If the panel closes while pick-mode is armed for this node, release it
      if (pickModeRef.current) {
        document.dispatchEvent(new CustomEvent('activateElementLinkMode', {
          detail: { active: false, sourceNodeId }
        }));
      }
    };
  }, [sourceNodeId]);

  const startPickMode = () => {
    setPickMode(true);
    document.dispatchEvent(new CustomEvent('activateElementLinkMode', {
      detail: { active: true, sourceNodeId, sourceLabel }
    }));
  };

  const keyOf = (c) => c.vendorId || c.userId || c.email || c.id;
  const isPicked = (c) => selected.some(s => (s.vendorId || s.userId || s.email) === keyOf(c));

  const toAssignee = (c) => ({
    vendorId: c.vendorId || c.userId || null,
    userId: c.userId || null,
    name: c.name || c.email || 'Unknown',
    email: c.email || null,
    role: c.role || c.userType || null
  });

  const togglePerson = (c) => {
    setSelected(prev =>
      prev.some(s => (s.vendorId || s.userId || s.email) === keyOf(c))
        ? prev.filter(s => (s.vendorId || s.userId || s.email) !== keyOf(c))
        : [...prev, toAssignee(c)]
    );
  };

  const pickSingle = (value) => {
    if (!value) return setSelected([]);
    const c = collaborators.find(x => keyOf(x) === value);
    setSelected(c ? [toAssignee(c)] : []);
  };

  const handleSave = () => {
    if (!selected.length) {
      onClear?.();
      return;
    }
    onSave?.({
      assignees: selected,
      answerMode: allowPoll ? mode : 'single',
      reason: reason.trim(),
      relatedNodeId: relatedNodeId || null,
      visibility,
      createdAt: access?.createdAt || new Date().toISOString(),
      createdBy: access?.createdBy || null
    });
  };

  const relatedElement = elements.find(el => el.id === relatedNodeId);
  const relatedName = relatedElement?.name || pickedName || (relatedNodeId ? 'Linked element' : '');

  return (
    <div
      className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-40 w-64 bg-surface border border-line rounded-lg shadow-xl p-3 space-y-3"
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
          <UserCheck className="w-3.5 h-3.5 text-info" />
          Who should answer?
        </div>
        <button onClick={onClose} className="p-0.5 text-dim hover:bg-surface-hover rounded" title="Close">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Answer mode — poll is only offered for multi-select fields */}
      {allowPoll && (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setMode('single')}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded text-xs border ${
              mode === 'single' ? 'bg-info text-white border-info' : 'bg-surface text-dim border-line'
            }`}
          >
            <UserCheck className="w-3 h-3" /> One person answers
          </button>
          <button
            onClick={() => setMode('poll')}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded text-xs border ${
              mode === 'poll' ? 'bg-info text-white border-info' : 'bg-surface text-dim border-line'
            }`}
          >
            <Users className="w-3 h-3" /> Multiple people (poll)
          </button>
        </div>
      )}

      {/* Assignees */}
      {allowPoll && mode === 'poll' ? (
        <div className="max-h-28 overflow-y-auto space-y-1 border border-line rounded p-1.5 bg-surface">
          {collaborators.length === 0 && (
            <p className="text-[10px] text-dim px-1 py-1">No collaborators available</p>
          )}
          {collaborators.map(c => (
            <label key={keyOf(c)} className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-canvas cursor-pointer">
              <input type="checkbox" checked={isPicked(c)} onChange={() => togglePerson(c)} className="w-3.5 h-3.5" />
              <span className="text-xs text-ink truncate">{c.name || c.email || 'Unknown'}</span>
              {(c.role || c.userType) && (
                <span className="text-[9px] text-dim uppercase">{c.role || c.userType}</span>
              )}
            </label>
          ))}
        </div>
      ) : (
        <select
          value={selected[0] ? (selected[0].vendorId || selected[0].userId || selected[0].email || '') : ''}
          onChange={(e) => pickSingle(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="w-full px-2 py-1.5 border border-line rounded-md text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-info"
        >
          <option value="">Anyone can answer</option>
          {collaborators.map(c => (
            <option key={keyOf(c)} value={keyOf(c)}>
              {c.name || c.email || 'Unknown'}
              {(c.role || c.userType) ? ` (${String(c.role || c.userType).toUpperCase()})` : ''}
            </option>
          ))}
        </select>
      )}

      {/* Reason */}
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wide text-dim mb-1">
          Why are you asking?
        </label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
          placeholder="e.g. Need your material rate for this line"
          className="w-full px-2 py-1.5 border border-line rounded-md text-xs bg-surface focus:outline-none focus:ring-2 focus:ring-info"
        />
      </div>

      {/* Related element — click-to-pick on the canvas */}
      <div>
        <label className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-dim mb-1">
          <Link2 className="w-3 h-3" /> Related to
        </label>
        {relatedNodeId ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => document.dispatchEvent(new CustomEvent('zoomToElement', { detail: { elementId: relatedNodeId } }))}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-info/10 text-info text-[10px] hover:bg-info/20"
              title="Jump to this element"
            >
              <Link2 className="w-2.5 h-2.5" /> {relatedName}
            </button>
            <button
              onClick={() => { setRelatedNodeId(''); setPickedName(''); }}
              className="p-0.5 rounded text-dim hover:bg-surface-hover hover:text-danger"
              title="Remove link"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={startPickMode}
            className={`w-full flex items-center justify-center gap-1.5 px-2 py-1.5 border rounded-md text-xs transition-colors ${
              pickMode
                ? 'border-info bg-info/10 text-info animate-pulse'
                : 'border-dashed border-line text-dim hover:border-info hover:text-info'
            }`}
          >
            <Crosshair className="w-3 h-3" />
            {pickMode ? 'Click an element on the canvas…' : 'Pick element on canvas'}
          </button>
        )}
        {pickMode && !relatedNodeId && (
          <p className="mt-1 text-[10px] text-dim">Click the element this field relates to — Esc to cancel</p>
        )}
      </div>

      {/* Visibility */}
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wide text-dim mb-1">
          Who can see the answer
        </label>
        <select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="w-full px-2 py-1.5 border border-line rounded-md text-xs bg-surface focus:outline-none focus:ring-2 focus:ring-info"
        >
          <option value="restricted">Restricted — Assignee, Creator &amp; PM</option>
          <option value="everyone">Everyone in the workspace</option>
        </select>
        <p className="mt-1 text-[10px] text-dim flex items-center gap-1">
          {visibility === 'restricted'
            ? <><EyeOff className="w-2.5 h-2.5" /> Others with view access see "Answer restricted"</>
            : <><Globe className="w-2.5 h-2.5" /> All workspace members can read the answer</>}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleSave}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-info text-white rounded-md text-xs hover:bg-info/90"
        >
          <Save className="w-3 h-3" /> Save assignment
        </button>
        {access?.assignees?.length > 0 && (
          <button
            onClick={onClear}
            className="px-2 py-1.5 bg-danger/10 text-danger rounded-md text-xs hover:bg-danger/20"
            title="Remove assignment"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};

export default FieldAccessPanel;
