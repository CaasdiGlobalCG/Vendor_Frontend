import React from 'react';
import { inputClasses, selectClasses } from '../ui/controlStyles';
import { CommitField, Row } from './blockControls';
import { ELEVATION_UNITS } from '../../utils/printingElements';

/** Settings for the printing and signage blocks. Most editing happens on the block itself; these are the fields that do not fit there. */
const PrintingBlockSettings = ({ kind, data, patch }) => {
  const field = inputClasses();
  const number = (key, label, placeholder) => (
    <Row label={label}>
      <CommitField value={String(data[key] ?? '')} onCommit={(v) => patch({ [key]: v })} inputMode="decimal" className={field} placeholder={placeholder} />
    </Row>
  );

  return (
    <>
      <Row label="Label">
        <CommitField value={data.label} onCommit={(v) => patch({ label: v })} className={field} />
      </Row>

      {kind === 'artwork' && (
        <>
          <Row label="Job">
            <CommitField value={data.job} onCommit={(v) => patch({ job: v })} className={field} placeholder="Shop front board" />
          </Row>
          <Row label="Client">
            <CommitField value={data.client} onCommit={(v) => patch({ client: v })} className={field} />
          </Row>
        </>
      )}

      {kind === 'elevation' && (
        <>
          <div className="grid grid-cols-3 gap-2">
            {number('width', 'Width', '12')}
            {number('height', 'Height', '4')}
            <Row label="Unit">
              <select value={data.unit || 'ft'} onChange={(e) => patch({ unit: e.target.value })} className={selectClasses()}>
                {ELEVATION_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </Row>
          </div>
          {number('mountingHeight', 'Mounting height (ground to bottom of board)', '10')}
          <Row label="Face material">
            <CommitField value={data.material} onCommit={(v) => patch({ material: v })} className={field} placeholder="ACP 3 mm, black" />
          </Row>
          <Row label="Frame">
            <CommitField value={data.frame} onCommit={(v) => patch({ frame: v })} className={field} placeholder="GI 25 × 25 box section" />
          </Row>
          <Row label="Lighting">
            <CommitField value={data.lighting} onCommit={(v) => patch({ lighting: v })} className={field} placeholder="LED strip, warm white" />
          </Row>
          <Row label="Finish">
            <CommitField value={data.finish} onCommit={(v) => patch({ finish: v })} className={field} placeholder="Matte lamination" />
          </Row>
        </>
      )}
    </>
  );
};

export default PrintingBlockSettings;
