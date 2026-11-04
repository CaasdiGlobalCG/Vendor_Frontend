import React from 'react';
import { inputClasses } from '../ui/controlStyles';
import { CommitField, Row } from './blockControls';

/** Settings for the construction blocks. Rows are edited on the block itself; these are the block-level fields. */
const ConstructionBlockSettings = ({ kind, data, patch }) => {
  const field = inputClasses();
  return (
    <>
      <Row label="Label">
        <CommitField value={data.label} onCommit={(v) => patch({ label: v })} className={field} />
      </Row>
      {kind === 'pour' && (
        <Row label="Expected 7-day strength (% of grade)">
          <CommitField value={String(data.expect7Pct ?? 65)} onCommit={(v) => patch({ expect7Pct: v })} inputMode="decimal" className={field} placeholder="65" />
        </Row>
      )}
    </>
  );
};

export default ConstructionBlockSettings;
