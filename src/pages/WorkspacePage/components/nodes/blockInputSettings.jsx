import React, { useState } from 'react';
import { LocateFixed } from 'lucide-react';
import { inputClasses, selectClasses } from '../ui/controlStyles';
import { CommitField, Row, Segment } from './blockControls';
import {
  CALLOUT_TONES,
  MEASURE_UNITS,
  PHOTO_MODES,
  RATING_MAX_CHOICES,
  clampRating,
  parseDay,
  ratingMax,
} from '../../utils/blockElements';

/** Settings fields for the signature, photos, location, rating, date range, measure, code and callout blocks. */

const UseMyLocation = ({ onFound }) => {
  const [state, setState] = useState('idle'); // idle | busy | error
  const supported = typeof navigator !== 'undefined' && !!navigator.geolocation;
  if (!supported) return null;
  return (
    <div>
      <button
        type="button"
        disabled={state === 'busy'}
        onClick={() => {
          setState('busy');
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setState('idle');
              onFound(pos.coords.latitude.toFixed(6), pos.coords.longitude.toFixed(6));
            },
            () => setState('error'),
            { enableHighAccuracy: true, timeout: 10000 }
          );
        }}
        className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-info disabled:opacity-60"
      >
        <LocateFixed className="h-3.5 w-3.5" aria-hidden="true" />
        {state === 'busy' ? 'Finding you…' : 'Use my location'}
      </button>
      {state === 'error' ? (
        <span role="alert" className="mt-1 block text-xs text-danger">Could not get your location. Allow location access or type the coordinates.</span>
      ) : null}
    </div>
  );
};

const DateField = ({ label, value, onCommit }) => (
  <Row label={label}>
    <CommitField
      type="date"
      value={value}
      onCommit={(v) => { if (v === '' || parseDay(v)) onCommit(v); }}
      className={inputClasses()}
    />
  </Row>
);

const InputBlockSettings = ({ kind, data, patch }) => {
  const field = inputClasses();

  const labelRow = (
    <Row label="Label">
      <CommitField value={data.label} onCommit={(v) => patch({ label: v })} className={field} />
    </Row>
  );

  if (kind === 'signature') {
    return (
      <>
        {labelRow}
        <Row label="Signer name">
          <CommitField value={data.signerName} onCommit={(v) => patch({ signerName: v })} className={field} placeholder="Who is signing" />
        </Row>
        <Row label="Role">
          <CommitField value={data.role} onCommit={(v) => patch({ role: v })} className={field} placeholder="Client, site engineer ..." />
        </Row>
      </>
    );
  }

  if (kind === 'photos') {
    return (
      <>
        {labelRow}
        <Row label="Layout">
          <Segment label="Photo layout" value={data.mode === 'beforeafter' ? 'beforeafter' : 'grid'} onChange={(mode) => patch({ mode })} options={PHOTO_MODES.map((m) => ({ value: m.value, title: m.label }))} />
        </Row>
      </>
    );
  }

  if (kind === 'location') {
    return (
      <>
        {labelRow}
        <Row label="Address">
          <CommitField value={data.address} onCommit={(v) => patch({ address: v })} className={field} placeholder="Street, area, city" />
        </Row>
        <div className="grid grid-cols-2 gap-2">
          <Row label="Latitude">
            <CommitField value={String(data.lat ?? '')} onCommit={(v) => patch({ lat: v })} inputMode="decimal" className={field} placeholder="12.9716" />
          </Row>
          <Row label="Longitude">
            <CommitField value={String(data.lng ?? '')} onCommit={(v) => patch({ lng: v })} inputMode="decimal" className={field} placeholder="77.5946" />
          </Row>
        </div>
        <UseMyLocation onFound={(lat, lng) => patch({ lat, lng })} />
      </>
    );
  }

  if (kind === 'rating') {
    const max = ratingMax(data.max);
    return (
      <>
        {labelRow}
        <Row label="Out of">
          <Segment
            label="Number of stars"
            value={max}
            onChange={(n) => patch({ max: n, value: clampRating(data.value, n) })}
            options={RATING_MAX_CHOICES.map((n) => ({ value: n, title: String(n) }))}
          />
        </Row>
      </>
    );
  }

  if (kind === 'daterange') {
    return (
      <>
        {labelRow}
        <div className="grid grid-cols-2 gap-2">
          <DateField label="Start" value={data.start} onCommit={(v) => patch({ start: v })} />
          <DateField label="End" value={data.end} onCommit={(v) => patch({ end: v })} />
        </div>
      </>
    );
  }

  if (kind === 'measure') {
    const custom = data.unit && !MEASURE_UNITS.includes(data.unit);
    return (
      <>
        {labelRow}
        <div className="grid grid-cols-2 gap-2">
          <Row label="Value">
            <CommitField value={String(data.value ?? '')} onCommit={(v) => patch({ value: v })} inputMode="decimal" className={field} placeholder="120" />
          </Row>
          <Row label="Unit">
            <select
              value={custom ? '__custom' : data.unit || ''}
              onChange={(e) => patch({ unit: e.target.value === '__custom' ? 'unit' : e.target.value })}
              className={selectClasses()}
            >
              <option value="">None</option>
              {MEASURE_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              <option value="__custom">Other…</option>
            </select>
          </Row>
        </div>
        {custom ? (
          <Row label="Custom unit">
            <CommitField value={data.unit} onCommit={(v) => patch({ unit: v.trim().slice(0, 12) })} className={field} />
          </Row>
        ) : null}
      </>
    );
  }

  if (kind === 'code') {
    return (
      <>
        {labelRow}
        <Row label="Type">
          <Segment
            label="Code type"
            value={data.format === 'barcode' ? 'barcode' : 'qr'}
            onChange={(format) => patch({ format })}
            options={[{ value: 'qr', title: 'QR code' }, { value: 'barcode', title: 'Barcode' }]}
          />
        </Row>
        <Row label={data.format === 'barcode' ? 'Reference (up to 40 characters)' : 'Text or link'}>
          <CommitField
            value={data.value}
            onCommit={(v) => patch({ value: v })}
            className={field}
            placeholder={data.format === 'barcode' ? 'PO-2026-0142' : 'https://…'}
          />
        </Row>
      </>
    );
  }

  if (kind === 'callout') {
    return (
      <>
        <Row label="Type">
          <Segment
            label="Callout type"
            value={data.tone || 'info'}
            onChange={(tone) => patch({ tone })}
            options={CALLOUT_TONES.map((t) => ({ value: t.id, title: t.label }))}
          />
        </Row>
        <Row label="Title">
          <CommitField value={data.title} onCommit={(v) => patch({ title: v })} className={field} />
        </Row>
        <Row label="Message">
          <CommitField multiline rows={3} value={data.text} onCommit={(v) => patch({ text: v })} className={field} />
        </Row>
      </>
    );
  }

  return null;
};

export default InputBlockSettings;
