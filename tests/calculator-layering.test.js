/**
 * Calculator modal contracts — static source checks.
 *
 * Two real bugs were found by manual testing and reproduced in a real browser
 * (see the harness notes in the PR/chat): 
 *
 *  1. LAYERING — when a calculator is opened from the Cost Calculators modal
 *     (a z-[9999] overlay), a calculator popup at z-50 renders *behind* it:
 *     visible but every click lands on the overlay. Verified in headless Edge:
 *     the topmost element at the popup's controls was the z-[9999] overlay.
 *     Contract: every calculator popup overlay must be z-[10000].
 *
 *  2. REMOUNT — modals declared as nested components (`const XModal = () => …`)
 *     are a NEW component type on every parent render, so React unmounts and
 *     remounts the subtree — the input DOM node is replaced on every keystroke
 *     and focus is lost (verified: inputSurvivesKeystroke === false). Contract:
 *     modal JSX must be rendered inline (function call), not as a component.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const FORMS_DIR = path.resolve(__dirname, '../src/pages/WorkspacePage/components/forms');
const MODALS_DIR = path.resolve(__dirname, '../src/pages/WorkspacePage/components/modals');

const CALCULATOR_FILES = fs
  .readdirSync(FORMS_DIR)
  .filter((f) => /(Calculator|Estimator|BOQGenerator)\.jsx$/.test(f));

const KIT_FILE = path.join(FORMS_DIR, 'calculator-kit', 'CalculatorKit.jsx');

describe('calculator modal layering contract', () => {
  it('every calculator popup overlay sits above the Cost Calculators modal (z-[10000])', () => {
    const offenders = [];
    for (const file of [...CALCULATOR_FILES.map((f) => path.join(FORMS_DIR, f)), KIT_FILE]) {
      const src = fs.readFileSync(file, 'utf8');
      src.split('\n').forEach((line, idx) => {
        if (line.includes('fixed inset-0')) {
          if (!line.includes('z-[10000]')) {
            offenders.push(`${path.basename(file)}:${idx + 1}: ${line.trim().slice(0, 100)}`);
          }
        }
      });
    }
    expect(offenders).toEqual([]);
  });

  it('the Cost Calculators modal keeps its z-[9999] baseline (the layer we must beat)', () => {
    const src = fs.readFileSync(path.join(MODALS_DIR, 'CostCalculatorsModal.jsx'), 'utf8');
    expect(src).toContain('z-[9999]');
  });
});

describe('calculator modal remount contract', () => {
  it('no calculator renders its modals as component elements (focus-loss bug)', () => {
    // Declaring the modal as a function is harmless; rendering it as <XModal />
    // is what creates a new component type each render → remount → focus loss.
    // The fix calls them inline (XModal()) so React reconciles in place.
    const offenders = [];
    for (const file of CALCULATOR_FILES) {
      const full = path.join(FORMS_DIR, file);
      const src = fs.readFileSync(full, 'utf8');
      if (/<(ConfigModal|DetailsModal|CalculationDetailsModal)\s*\/>/.test(src)) {
        offenders.push(`${file} renders a modal as a component element`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the shared kit modal is a top-level component (already correct)', () => {
    const src = fs.readFileSync(KIT_FILE, 'utf8');
    expect(src).toContain('export const CalcModal');
    expect(src).toContain('z-[10000]');
  });
});
