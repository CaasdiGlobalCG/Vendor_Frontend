import React, { useId, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { useChartTheme, pickSeriesColors } from './chartTheme';

const CHART_HEIGHT = 224;

/** Dark tooltip pill: "label · value". */
const ChartTooltip = ({ active, payload, theme, xAxisLabel }) => {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload || {};
  const label = point.label ?? payload[0].name;
  const value = payload[0].value;
  return (
    <div
      className="rounded-lg px-2.5 py-1.5 text-xs shadow-pop"
      style={{ background: theme.ink, color: theme.paper }}
    >
      <span className="font-medium">{label}</span>
      {point.x !== undefined && xAxisLabel ? <span className="opacity-70"> · {xAxisLabel} {point.x}</span> : null}
      <span className="opacity-70"> · </span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
};

const ChartRenderer = ({ data, chartType }) => {
  const theme = useChartTheme();
  const gradientId = `${useId().replace(/:/g, '')}-area`;

  // Use custom chart data if available, otherwise use default
  const chartConfig = data?.customChartData || getDefaultChartData(chartType);
  const { title, xAxisLabel, yAxisLabel, data: rawData, colors: savedColors } = chartConfig;

  // Keep the same array between renders unless the data really changed: the
  // canvas re-renders nodes constantly (pan, zoom, selection ...), and a new
  // array each time makes recharts treat it as new data.
  const points = useMemo(
    () =>
      (Array.isArray(rawData) ? rawData : []).map((item) => ({
        ...item,
        value: Number(item.value) || 0,
        ...(item.x !== undefined ? { x: Number(item.x) || 0 } : {}),
      })),
    [rawData]
  );

  const { colors, customised } = pickSeriesColors(savedColors, theme, points.length);
  const primary = colors[0];

  const tick = { fontSize: 11, fill: theme.muted };
  const grid = <CartesianGrid vertical={false} stroke={theme.grid} strokeDasharray="3 4" />;
  const xLabel = xAxisLabel
    ? { value: xAxisLabel, position: 'insideBottom', offset: -2, fill: theme.muted, fontSize: 11 }
    : undefined;
  const yLabel = yAxisLabel
    ? { value: yAxisLabel, angle: -90, position: 'insideLeft', fill: theme.muted, fontSize: 11 }
    : undefined;
  const margin = { top: 8, right: 8, bottom: xAxisLabel ? 8 : 0, left: 0 };
  const tooltip = (
    <Tooltip
      cursor={{ fill: theme.hover, fillOpacity: 0.6 }}
      content={<ChartTooltip theme={theme} xAxisLabel={chartType === 'scatter-plot' ? xAxisLabel : undefined} />}
    />
  );
  // `inset` keeps the first/last point of line and area charts off the plot edge
  const categoryX = (inset = false) => (
    <XAxis
      dataKey="label"
      padding={inset ? { left: 14, right: 14 } : undefined}
      tick={tick}
      tickLine={false}
      axisLine={{ stroke: theme.grid }}
      height={xAxisLabel ? 36 : 24}
      label={xLabel}
    />
  );
  const valueY = (
    <YAxis tick={tick} tickLine={false} axisLine={false} width={yAxisLabel ? 44 : 32} label={yLabel} />
  );

  const renderBarChart = () => (
    <BarChart data={points} margin={margin}>
      {grid}
      {categoryX()}
      {valueY}
      {tooltip}
      <Bar dataKey="value" fill={primary} radius={[6, 6, 0, 0]} maxBarSize={36} isAnimationActive={false}>
        {customised && points.map((_, i) => <Cell key={i} fill={colors[i]} />)}
      </Bar>
    </BarChart>
  );

  const renderLineChart = () => (
    <LineChart data={points} margin={margin}>
      {grid}
      {categoryX(true)}
      {valueY}
      {tooltip}
      <Line
        type="monotone"
        dataKey="value"
        stroke={primary}
        strokeWidth={2}
        isAnimationActive={false}
        dot={{ r: 3, fill: primary, stroke: theme.surface, strokeWidth: 2 }}
        activeDot={{ r: 5, fill: primary, stroke: theme.surface, strokeWidth: 2 }}
      />
    </LineChart>
  );

  const renderAreaChart = () => (
    <AreaChart data={points} margin={margin}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={primary} stopOpacity={0.28} />
          <stop offset="100%" stopColor={primary} stopOpacity={0} />
        </linearGradient>
      </defs>
      {grid}
      {categoryX(true)}
      {valueY}
      {tooltip}
      <Area type="monotone" dataKey="value" stroke={primary} strokeWidth={2} fill={`url(#${gradientId})`} isAnimationActive={false} />
    </AreaChart>
  );

  const renderPieChart = (donut) => (
    <PieChart>
      <Tooltip content={<ChartTooltip theme={theme} />} />
      <Pie
        data={points}
        dataKey="value"
        nameKey="label"
        innerRadius={donut ? '58%' : 0}
        outerRadius="86%"
        paddingAngle={donut ? 2 : 0}
        stroke={theme.surface}
        strokeWidth={2}
        isAnimationActive={false}
      >
        {points.map((_, i) => (
          <Cell key={i} fill={colors[i]} />
        ))}
      </Pie>
    </PieChart>
  );

  const renderScatterPlot = () => (
    <ScatterChart margin={margin}>
      {grid}
      <XAxis
        type="number"
        dataKey="x"
        name={xAxisLabel || 'x'}
        tick={tick}
        tickLine={false}
        axisLine={{ stroke: theme.grid }}
        height={xAxisLabel ? 36 : 24}
        label={xLabel}
      />
      <YAxis
        type="number"
        dataKey="value"
        name={yAxisLabel || 'value'}
        tick={tick}
        tickLine={false}
        axisLine={false}
        width={yAxisLabel ? 44 : 32}
        label={yLabel}
      />
      {tooltip}
      <Scatter data={points} fill={primary} fillOpacity={0.85} isAnimationActive={false} />
    </ScatterChart>
  );

  const renderChart = () => {
    switch (chartType) {
      case 'line-chart':
        return renderLineChart();
      case 'pie-chart':
        return renderPieChart(false);
      case 'area-chart':
        return renderAreaChart();
      case 'donut-chart':
        return renderPieChart(true);
      case 'scatter-plot':
        return renderScatterPlot();
      case 'bar-chart':
      default:
        return renderBarChart();
    }
  };

  const isPie = chartType === 'pie-chart' || chartType === 'donut-chart';
  const summary = `${title || 'Chart'}: ${points.map((p) => `${p.label} ${p.value}`).join(', ')}`;

  return (
    <div className="w-full">
      {title && <h3 className="mb-3 text-sm font-semibold text-ink">{title}</h3>}

      {points.length === 0 ? (
        <div
          className="flex items-center justify-center rounded-lg border border-dashed border-line text-xs text-dim"
          style={{ height: CHART_HEIGHT }}
        >
          No data yet
        </div>
      ) : (
        <div role="img" aria-label={summary} className="w-full" style={{ height: CHART_HEIGHT }}>
          <ResponsiveContainer
            width="100%"
            height="100%"
            initialDimension={{ width: 320, height: CHART_HEIGHT }}
          >
            {renderChart()}
          </ResponsiveContainer>
        </div>
      )}

      {/* Legend for pie and donut charts */}
      {isPie && points.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {points.map((item, index) => (
            <li key={index} className="flex items-center gap-1.5 text-xs text-ink">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: colors[index] }}
                aria-hidden="true"
              />
              {item.label}
              <span className="tabular-nums text-dim">{item.value}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 text-xs text-dim">
        {points.length} data {points.length === 1 ? 'point' : 'points'} · click to customize
      </div>
    </div>
  );
};

// Default chart data for different chart types
const getDefaultChartData = (chartType) => {
  const defaultConfigs = {
    'bar-chart': {
      title: 'Sample Bar Chart',
      xAxisLabel: 'Categories',
      yAxisLabel: 'Values',
      data: [
        { label: 'A', value: 30 },
        { label: 'B', value: 45 },
        { label: 'C', value: 25 },
        { label: 'D', value: 35 }
      ],
      colors: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B']
    },
    'line-chart': {
      title: 'Sample Line Chart',
      xAxisLabel: 'Time',
      yAxisLabel: 'Value',
      data: [
        { label: 'Jan', value: 20 },
        { label: 'Feb', value: 35 },
        { label: 'Mar', value: 25 },
        { label: 'Apr', value: 45 }
      ],
      colors: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B']
    },
    'pie-chart': {
      title: 'Sample Pie Chart',
      xAxisLabel: '',
      yAxisLabel: '',
      data: [
        { label: 'Desktop', value: 60 },
        { label: 'Mobile', value: 30 },
        { label: 'Tablet', value: 10 }
      ],
      colors: ['#3B82F6', '#EF4444', '#10B981']
    },
    'area-chart': {
      title: 'Sample Area Chart',
      xAxisLabel: 'Period',
      yAxisLabel: 'Growth',
      data: [
        { label: 'Q1', value: 20 },
        { label: 'Q2', value: 35 },
        { label: 'Q3', value: 45 },
        { label: 'Q4', value: 55 }
      ],
      colors: ['#3B82F6']
    },
    'donut-chart': {
      title: 'Sample Donut Chart',
      xAxisLabel: '',
      yAxisLabel: '',
      data: [
        { label: 'Sales', value: 40 },
        { label: 'Marketing', value: 25 },
        { label: 'Support', value: 20 },
        { label: 'Dev', value: 15 }
      ],
      colors: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B']
    },
    'scatter-plot': {
      title: 'Sample Scatter Plot',
      xAxisLabel: 'X Values',
      yAxisLabel: 'Y Values',
      data: [
        { label: 'A', value: 20, x: 10 },
        { label: 'B', value: 35, x: 25 },
        { label: 'C', value: 45, x: 40 },
        { label: 'D', value: 30, x: 55 }
      ],
      colors: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B']
    }
  };

  return defaultConfigs[chartType] || defaultConfigs['bar-chart'];
};

export default ChartRenderer;
