// ============================================================
// FILE: FinancePanel.jsx
// PURPOSE: Finance summary — headline figures plus a real revenue chart with a
//          timeframe control that actually changes what is plotted.
// CONNECTS TO: components/dashboard/Panel, components/dashboard/dashboard.constants.js (formatters), recharts.
//
// Fixes carried over from the shipped RevenueChart:
//   - it imported Bar/Line/Pie but never rendered a chart (RevenueChart.jsx:5 vs :187-281)
//   - its timeframe <select> was inert, because displayRevenue preferred the
//     always-supplied totalRevenue prop over the filtered value (RevenueChart.jsx:175-177)
// The control here is only rendered when the series labels are parseable dates,
// so it can never be shown while doing nothing.
// ============================================================

import { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { Panel } from './Panel';
import { COPY, formatCurrencyShort } from './dashboard.constants';

const RANGES = [
  { id: '3m', label: '3M', months: 3 },
  { id: '6m', label: '6M', months: 6 },
  { id: '1y', label: '1Y', months: 12 },
  { id: '5y', label: '5Y', months: 60 },
  { id: 'all', label: 'All', months: null },
];

/** @returns {number|null} epoch ms, or null when the label is not a real date */
function parseLabel(label) {
  if (!label) return null;
  const d = new Date(String(label).replace(/,/g, ' '));
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-white/15 bg-black px-3 py-2 text-xs text-white shadow-modal">
      <p className="text-white/55">{label}</p>
      <p className="tnum mt-0.5 font-semibold">{formatCurrencyShort(payload[0].value)}</p>
    </div>
  );
}

/**
 * @param {object} props
 * @param {object|null} props.finance { series, totalRevenue, totalExpenses, netProfit }
 * @param {'loading'|'error'|'empty'|'ready'} props.state
 * @param {number} [props.chartHeight=170]
 */
export function FinancePanel({ finance, state, chartHeight = 170 }) {
  const [range, setRange] = useState('1y');

  const series = finance?.series || [];

  const parsed = useMemo(
    () => series.map((point) => ({ ...point, ts: parseLabel(point.date || point.label) })),
    [series]
  );

  // Only offer the control when every point has a real date behind it.
  const datesUsable = parsed.length > 1 && parsed.every((point) => point.ts !== null);

  const visible = useMemo(() => {
    if (!datesUsable) return parsed;
    const months = RANGES.find((r) => r.id === range)?.months;
    if (!months) return parsed;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    return parsed.filter((point) => point.ts >= cutoff.getTime());
  }, [parsed, range, datesUsable]);

  // Prefer the API summary; fall back to summing the real plotted values.
  const plottedRevenue = visible.reduce((sum, point) => sum + (Number(point.revenue) || 0), 0);
  const revenue = finance?.totalRevenue ?? (visible.length ? plottedRevenue : null);

  const cells = [
    { label: 'Total revenue', value: formatCurrencyShort(revenue), tone: 'text-white' },
    { label: 'Total expenses', value: formatCurrencyShort(finance?.totalExpenses), tone: 'text-danger' },
    { label: 'Net profit', value: formatCurrencyShort(finance?.netProfit), tone: 'text-success' },
  ];

  return (
    <Panel
      title="Financial overview"
      state={state === 'ready' && !finance ? 'empty' : state}
      emptyTitle={COPY.noFinance}
      emptyHint={COPY.noFinanceHint}
      bodyPadded={false}
    >
      {/* The page's one sanctioned ink surface (BRAND.md §1: ink is rationed). */}
      <div className="m-4 rounded-md bg-black p-4 text-white sm:m-5 sm:p-5">
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-white/15 bg-white/15 sm:grid-cols-3">
          {cells.map((cell) => (
            <div key={cell.label} className="min-w-0 bg-black p-4">
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/55">{cell.label}</p>
              <p className={`tnum mt-2 truncate text-lg font-semibold tracking-tight ${cell.tone}`}>
                {cell.value}
              </p>
            </div>
          ))}
        </div>

        {visible.length > 0 ? (
          <div className="mt-4" style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={visible} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
                <defs>
                  <linearGradient id="variantRevenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.10)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={24}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.25)' }} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#ffffff"
                  strokeWidth={1.5}
                  fill="url(#variantRevenueFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="mt-4 text-xs text-white/55">No monthly figures recorded yet.</p>
        )}

        {datesUsable && (
          <div className="mt-4 flex flex-wrap items-center gap-1" role="group" aria-label="Chart time range">
            {RANGES.map((option) => {
              const active = range === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setRange(option.id)}
                  aria-pressed={active}
                  className={[
                    'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
                    active ? 'bg-white text-black' : 'text-white/55 hover:bg-white/10 hover:text-white',
                  ].join(' ')}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Panel>
  );
}
