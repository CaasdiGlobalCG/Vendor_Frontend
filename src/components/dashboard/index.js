/**
 * FILE: index.js
 * PURPOSE: Barrel export — import any dashboard component from one path.
 * CONNECTS TO: all files in src/components/dashboard/.
 *
 * Usage: import { Panel, MetricTile, StatusPill } from '@/components/dashboard';
 *        (or relative path depending on the page location)
 */

export * from './dashboard.constants';
export { MetricTile } from './MetricTile';
export { Sparkline } from './Sparkline';
export { StatusPill } from './StatusPill';
export { StageRail } from './StageRail';
export { StatusBar } from './StatusBar';
export { ProgressBar } from './ProgressBar';
export { Panel } from './Panel';
export { ProjectTable } from './ProjectTable';
export { TenderPanel } from './TenderPanel';
export { FinancePanel } from './FinancePanel';
