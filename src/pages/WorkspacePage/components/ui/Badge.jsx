import React from 'react';

const TONES = {
  neutral: 'bg-surface-hover text-dim',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  info: 'bg-info/10 text-info',
};

/** Small rounded status pill. */
const Badge = ({ tone = 'neutral', children, className = '' }) => (
  <span
    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium leading-4 ${
      TONES[tone] || TONES.neutral
    } ${className}`}
  >
    {children}
  </span>
);

const SUCCESS = ['active', 'done', 'complete', 'completed', 'paid', 'approved', 'delivered', 'success', 'open', 'yes', 'ok', 'resolved', 'accepted'];
const WARNING = ['pending', 'draft', 'in progress', 'in review', 'review', 'partial', 'on hold', 'waiting', 'scheduled', 'processing'];
const DANGER = ['overdue', 'rejected', 'failed', 'cancelled', 'canceled', 'blocked', 'inactive', 'late', 'declined', 'error', 'no'];

/**
 * Map a cell value to a badge tone, or null when it is not status-like.
 * Matches whole values only ("Active", "in progress"), so ordinary text such
 * as a person's name is never turned into a pill.
 */
export const statusTone = (value) => {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  if (!v) return null;
  if (SUCCESS.includes(v)) return 'success';
  if (WARNING.includes(v)) return 'warning';
  if (DANGER.includes(v)) return 'danger';
  return null;
};

export default Badge;
