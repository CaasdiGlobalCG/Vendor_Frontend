// ============================================================
// FILE: index.js
// PURPOSE: Barrel export — import any support primitive from one path.
// CONNECTS TO: support-tone.js, SupportPills.jsx, SupportList.jsx, SupportFaqPanel.jsx.
//
// Usage: import { StatusPill, TicketRow, ListStates, SupportFaqPanel } from '../../components/support';
// ============================================================

export {
  PRIORITY_TONE,
  STATUS_FILTERS,
  STATUS_TONE,
  SUPPORT_HOURS,
  SUPPORT_TEAM,
  fmtDate,
  fmtRelative,
  priorityTone,
  statusTone,
} from './support-tone';
export { PriorityPill, StatusPill } from './SupportPills';
export { ListStates, StatusFilterChips, TicketRow } from './SupportList';
export { SupportFaqPanel } from './SupportFaqPanel';
