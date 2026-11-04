/**
 * Workspace elements palette — registry suite.
 *
 * The palette (WorkspaceContextPanel, "elements" tab) is the source of truth
 * for what users can drag onto the canvas. This suite pins the Cost Calculators
 * registry so a calculator can never silently disappear from the palette.
 */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, screen, cleanup } from '@testing-library/react';

import WorkspaceContextPanel from '../src/pages/WorkspacePage/components/WorkspaceContextPanel.jsx';

afterEach(() => {
  cleanup();
});

const renderElementsTab = () =>
  render(
    <WorkspaceContextPanel
      isOpen
      activeTab="elements"
      onClose={() => {}}
      elementOptions={{}}
      workspace={{}}
      userRole="vendor"
    />
  );

describe('elements palette — Cost Calculators registry', () => {
  it('lists the Cost Calculators category in the elements tab', () => {
    renderElementsTab();
    expect(screen.getAllByText(/cost calculators/i).length).toBeGreaterThan(0);
  });

  it('opening Cost Calculators shows every existing calculator + BOQ generator', () => {
    renderElementsTab();

    // Open the category (first match is the category card itself)
    fireEvent.click(screen.getAllByText(/cost calculators/i)[0]);

    const expectedEntries = [
      /bricks calculator/i,
      /concrete calculator/i,
      /concrete blocks calculator/i,
      /flooring calculator/i,
      /vinyl flooring calculator/i,
      /soil excavation calculator/i,
      /steel estimation calculator/i,
      /painting estimator/i,
      /electrical wiring estimator/i,
      /boq generator/i,
      /freight cost calculator/i,
      // Batch A additions
      /plaster calculator/i,
      /pcc calculator/i,
      /putty & primer calculator/i,
      /sand & aggregate calculator/i,
      // Batch B additions
      /concrete column calculator/i,
      /concrete footing calculator/i,
      /concrete stairs calculator/i,
      /rcc formwork calculator/i,
      // Batch C additions
      /rebar \/ bbs calculator/i,
      /aac blocks calculator/i,
      /tiles calculator/i,
      // Batch D additions
      /waterproofing calculator/i,
      /roofing calculator/i,
      /drywall \/ partition calculator/i,
      /retaining wall calculator/i,
      // Wave 2 · Batch E additions (timber & framing)
      /decking calculator/i,
      /framing calculator/i,
      /lumber calculator/i,
      /roof truss calculator/i,
    ];

    for (const entry of expectedEntries) {
      expect(screen.getAllByText(entry).length).toBeGreaterThan(0);
    }
  });

  it('groups the calculators so the list stays findable', () => {
    renderElementsTab();
    fireEvent.click(screen.getAllByText(/cost calculators/i)[0]);

    const groups = [
      /concrete & cement/i,
      /masonry/i,
      /steel & rebar/i,
      /earthwork & aggregates/i,
      /finishes/i,
      /waterproofing & envelope/i,
      /partitions & ceilings/i,
      /timber & framing/i,
      /^mep$/i,
      /cost & logistics/i,
    ];
    for (const group of groups) {
      expect(screen.getAllByText(group).length).toBeGreaterThan(0);
    }
  });
});

describe('elements palette — Basics', () => {
  it('lists heading, divider, status, progress and KPI under Basics', () => {
    renderElementsTab();
    fireEvent.click(screen.getAllByText(/^basics$/i)[0]);
    for (const name of [/^heading$/i, /^divider$/i, /status badge/i, /progress bar/i, /kpi card/i]) {
      expect(screen.getAllByText(name).length, String(name)).toBeGreaterThan(0);
    }
  });

  it('a dragged Basics element carries the node type and its settings', () => {
    renderElementsTab();
    fireEvent.click(screen.getAllByText(/^basics$/i)[0]);
    const card = screen.getAllByText(/kpi card/i)[0].closest('[draggable="true"]');
    const store = {};
    fireEvent.dragStart(card, { dataTransfer: { setData: (k, v) => { store[k] = v; }, setDragImage() {}, effectAllowed: '' } });
    const dropped = JSON.parse(store['application/json']);
    expect(dropped.nodeType).toBe('blockNode');
    expect(dropped.data.kind).toBe('kpi');
  });
});
