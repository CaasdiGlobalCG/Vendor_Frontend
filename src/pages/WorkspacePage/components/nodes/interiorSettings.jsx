import React from 'react';
import { inputClasses, selectClasses } from '../ui/controlStyles';
import { CommitField, Row } from './blockControls';
import { MEASURE_UNITS } from '../../utils/interiorElements';

/** Settings for the interiors blocks. Rooms, rows and tiles are edited on the block itself; these are the block-level fields. */
const InteriorBlockSettings = ({ kind, data, patch }) => {
  const field = inputClasses();
  return (
    <>
      <Row label="Label">
        <CommitField value={data.label} onCommit={(v) => patch({ label: v })} className={field} />
      </Row>
      {kind === 'sitemeasure' && (
        <>
          <Row label="Room">
            <CommitField value={data.room} onCommit={(v) => patch({ room: v })} className={field} placeholder="Master bedroom" />
          </Row>
          <div className="grid grid-cols-2 gap-2">
            <Row label="Unit">
              <select value={data.unit || 'ft'} onChange={(e) => patch({ unit: e.target.value })} className={selectClasses()}>
                {MEASURE_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </Row>
            <Row label="Ceiling height">
              <CommitField value={String(data.ceilingHeight ?? '')} onCommit={(v) => patch({ ceilingHeight: v })} inputMode="decimal" className={field} placeholder="10" />
            </Row>
          </div>
        </>
      )}
    </>
  );
};

export default InteriorBlockSettings;
