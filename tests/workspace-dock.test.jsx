/**
 * Workspace dock + context panel — Layouts removal regression suite.
 *
 * The "Layouts" feature (dock tab + 4 pattern options + the old right-side
 * LayoutsPanel) was removed as dead UI. These tests pin that removal so the
 * tab can never silently come back, and confirm the remaining dock tabs and
 * panel tabs still render.
 */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, screen, cleanup } from '@testing-library/react';

import WorkspaceDock from '../src/pages/WorkspacePage/components/WorkspaceDock.jsx';
import WorkspaceContextPanel from '../src/pages/WorkspacePage/components/WorkspaceContextPanel.jsx';

afterEach(() => {
  cleanup();
});

const renderDock = (props = {}) =>
  render(
    <WorkspaceDock
      activeTab="elements"
      onSelectTab={() => {}}
      isPanelOpen
      {...props}
    />
  );

const renderPanel = (activeTab) =>
  render(
    <WorkspaceContextPanel
      isOpen
      activeTab={activeTab}
      onClose={() => {}}
      elementOptions={{}}
      workspace={{}}
      userRole="vendor"
    />
  );

describe('WorkspaceDock — Layouts tab removed', () => {
  it('does not render a Layouts dock item', () => {
    renderDock();
    expect(screen.queryByText('Layouts')).toBeNull();
    expect(document.querySelector("[data-tour='layouts-btn']")).toBeNull();
  });

  it('still renders every remaining top and bottom dock item', () => {
    renderDock();
    for (const label of ['Elements', 'Text', 'Templates', 'Flow', 'Tasks', 'Layers', 'Assets', 'Agents']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it('clicking a dock item calls onSelectTab with its id', () => {
    const onSelectTab = vi.fn();
    renderDock({ onSelectTab });
    fireEvent.click(screen.getByText('Text'));
    expect(onSelectTab).toHaveBeenCalledWith('text');
  });

  it('clicking a dock item does nothing when disabled', () => {
    const onSelectTab = vi.fn();
    renderDock({ onSelectTab, disabled: true });
    fireEvent.click(screen.getByText('Templates'));
    expect(onSelectTab).not.toHaveBeenCalled();
  });
});

describe('WorkspaceContextPanel — layouts tab content removed', () => {
  it('renders no layout pattern options when activeTab is "layouts"', () => {
    renderPanel('layouts');
    // The removed tab previously showed these four patterns.
    for (const removed of ['Row Stack', 'Columns (Split)', '2 × 2 Grid', 'Container Frame']) {
      expect(screen.queryByText(removed)).toBeNull();
    }
    // And the panel header itself is gone too.
    expect(screen.queryByText(/Pre-configured structural wireframes/i)).toBeNull();
  });

  it('still renders the elements tab (unaffected by the removal)', () => {
    renderPanel('elements');
    expect(screen.getAllByText(/drag any block onto the canvas/i).length).toBeGreaterThan(0);
  });
});

describe('elements tab — Divider chip removed', () => {
  it('does not offer the Divider quick chip', () => {
    renderPanel('elements');
    expect(screen.queryByText('Divider')).toBeNull();
  });

  it('still shows the other quick chips', () => {
    renderPanel('elements');
    for (const label of ['Info Card', 'Table', 'Image']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });
});

describe('elements tab — Flowcharts & Logic category removed', () => {
  it('does not list the Flowcharts & Logic category', () => {
    renderPanel('elements');
    expect(screen.queryByText(/flowcharts & logic/i)).toBeNull();
    expect(screen.queryByText('Process Flow Block')).toBeNull();
    expect(screen.queryByText('Decision Branch')).toBeNull();
    expect(screen.queryByText('Milestone Gate')).toBeNull();
  });

  it('still lists the neighbouring categories', () => {
    renderPanel('elements');
    for (const name of [/analytics & charts/i, /task cards/i, /materials & boq/i]) {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    }
  });
});

describe('Forms & Inputs — renamed and split elements', () => {
  it('shows Comment, Text Box and Input Field as distinct items', () => {
    renderPanel('elements');
    fireEvent.click(screen.getAllByText(/forms & inputs/i)[0]);

    expect(screen.getAllByText('Comment').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Text Box').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Input Field').length).toBeGreaterThan(0);
  });

  it('still lists the rest of the forms category', () => {
    renderPanel('elements');
    fireEvent.click(screen.getAllByText(/forms & inputs/i)[0]);

    for (const name of ['Form Card', 'Action Button', 'Select Dropdown', 'Radio Choice', 'Checkbox Group']) {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    }
  });
});

describe('Materials & BOQ — BOQ Pricing Table removed', () => {
  it('does not list BOQ Pricing Table but keeps the other two items', () => {
    renderPanel('elements');
    // Open the Materials & BOQ category
    fireEvent.click(screen.getAllByText(/materials & boq/i)[0]);

    expect(screen.queryByText('BOQ Pricing Table')).toBeNull();
    expect(screen.getAllByText('Material Spec Card').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Vendor Catalog Block').length).toBeGreaterThan(0);
  });
});
