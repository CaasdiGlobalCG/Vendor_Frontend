// ============================================================
// FILE: Sparkline.jsx
// PURPOSE: Dependency-free inline SVG sparkline for KPI tiles. Trend shape only —
//          it carries no axis, no labels and no fabricated endpoints.
// CONNECTS TO: used by components/dashboard/MetricTile.jsx.
// ============================================================

/**
 * @param {object} props
 * @param {number[]} props.values series in chronological order
 * @param {string} [props.strokeClass='text-ink'] line colour
 * @param {number} [props.width=96]
 * @param {number} [props.height=28]
 */
export function Sparkline({ values, strokeClass = 'text-ink', width = 96, height = 28 }) {
  const series = Array.isArray(values) ? values.filter((v) => Number.isFinite(Number(v))).map(Number) : [];

  // A single point has no shape to draw — render nothing rather than a fake line.
  if (series.length < 2) return null;

  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const stepX = width / (series.length - 1);

  const points = series
    .map((value, index) => `${(index * stepX).toFixed(2)},${(height - ((value - min) / span) * height).toFixed(2)}`)
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={strokeClass}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
