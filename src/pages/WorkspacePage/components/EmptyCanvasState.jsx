import React from 'react';
import { Grid, LayoutTemplate, Type, Heading } from 'lucide-react';
import { blockElementFor } from '../utils/blockElements';

const addElement = (element) => document.dispatchEvent(new CustomEvent('elementDoubleClick', { detail: element }));
const openPanel = (tab) => window.dispatchEvent(new CustomEvent('workspace-open-panel', { detail: { tab } }));

export const TEXT_BOX_ELEMENT = { id: 'textbox', name: 'TextBox', type: 'textbox', preview: 'Single line text input' };
export const headingElement = () => blockElementFor('heading');

/**
 * The four ways to start. What each one does is decided by the caller: on an
 * empty canvas they act at once; in a workspace with no tasks yet (no canvas
 * to act on) they ask first.
 */
export const StartCards = ({ onElements, onTemplates, onTextBox, onHeading }) => {
  const actions = [
    { id: 'elements', label: 'Browse elements', hint: 'Tables, charts, forms, BOQ...', icon: Grid, run: onElements, primary: true },
    { id: 'templates', label: 'Start from a template', hint: 'Ready-made workflows', icon: LayoutTemplate, run: onTemplates },
    { id: 'textbox', label: 'Add a text box', hint: 'Type notes right away', icon: Type, run: onTextBox },
    { id: 'heading', label: 'Add a heading', hint: 'Title your canvas', icon: Heading, run: onHeading },
  ];
  return (
    <div className="pointer-events-auto grid grid-cols-1 gap-2 sm:grid-cols-2">
      {actions.map(({ id, label, hint, icon: Icon, run, primary }) => (
        <button
          key={id}
          type="button"
          onClick={run}
          className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-info ${
            primary ? 'border-cta bg-cta text-cta-foreground hover:opacity-90' : 'border-line bg-surface text-ink hover:bg-surface-hover'
          }`}
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0">
            <span className="block text-sm font-medium">{label}</span>
            <span className={`block text-xs ${primary ? 'opacity-70' : 'text-dim'}`}>{hint}</span>
          </span>
        </button>
      ))}
    </div>
  );
};

/**
 * What an empty canvas offers. Editors get one-click ways to start;
 * view-only people just see that nothing is here yet.
 */
const EmptyCanvasState = ({ canEdit }) => (
  <div
    className="pointer-events-none absolute inset-0 flex items-center justify-center px-4"
    data-testid="empty-canvas"
  >
    <div className="max-w-md text-center">
      <h3 className="m-0 text-lg font-semibold text-ink">
        {canEdit ? 'Start your canvas' : 'Nothing on this canvas yet'}
      </h3>
      <p className="mb-5 mt-1 text-sm text-dim">
        {canEdit
          ? 'Drag an element in from the panel, or pick a way to begin.'
          : 'When elements are added, they will show up here.'}
      </p>
      {canEdit && (
        <StartCards
          onElements={() => openPanel('elements')}
          onTemplates={() => openPanel('template-library')}
          onTextBox={() => addElement(TEXT_BOX_ELEMENT)}
          onHeading={() => addElement(headingElement())}
        />
      )}
    </div>
  </div>
);

export default EmptyCanvasState;
