import React from 'react';
import { inputClasses, selectClasses } from '../ui/controlStyles';
import { CommitField, Row } from './blockControls';
import { BATCH_UNITS, TEMP_UNITS } from '../../utils/foodElements';

/** Settings for the Food and FMCG blocks. Rows are edited on the block itself; these are the block-level fields. */
const FoodBlockSettings = ({ kind, data, patch }) => {
  const field = inputClasses();
  const number = (key, label, placeholder, inputMode = 'decimal') => (
    <Row label={label}>
      <CommitField value={String(data[key] ?? '')} onCommit={(v) => patch({ [key]: v })} inputMode={inputMode} className={field} placeholder={placeholder} />
    </Row>
  );

  return (
    <>
      <Row label="Label">
        <CommitField value={data.label} onCommit={(v) => patch({ label: v })} className={field} />
      </Row>

      {kind === 'batch' && (
        <>
          <Row label="Unit of output">
            <select value={data.unit || 'kg'} onChange={(e) => patch({ unit: e.target.value })} className={selectClasses()}>
              {BATCH_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </Row>
          {number('yieldTarget', 'Yield target (%)', '95')}
        </>
      )}

      {(kind === 'shelflife' || kind === 'licence') && number(
        'warnDays',
        kind === 'licence' ? 'Warn this many days before expiry' : 'Mark as expiring this many days before',
        kind === 'licence' ? '60' : '30',
        'numeric'
      )}

      {kind === 'templog' && (
        <>
          <Row label="Location">
            <CommitField value={data.location} onCommit={(v) => patch({ location: v })} className={field} placeholder="Cold room 1" />
          </Row>
          <div className="grid grid-cols-3 gap-2">
            {number('min', 'Lowest allowed', '2')}
            {number('max', 'Highest allowed', '8')}
            <Row label="Unit">
              <select value={data.unit || '°C'} onChange={(e) => patch({ unit: e.target.value })} className={selectClasses()}>
                {TEMP_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </Row>
          </div>
        </>
      )}
    </>
  );
};

export default FoodBlockSettings;
