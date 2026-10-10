/**
 * Shared node authorship metadata.
 *
 * Nodes created through the main element path (createElementNode) stamp
 * `addedBy` / `addedByEmail` / `addedByRole` / `addedAt` so the canvas info
 * panel can show who added an element. Text nodes are created through several
 * separate paths (text tool, flowchart toolbar, TextPanel drop, asset drop),
 * so this helper keeps that shape identical across all of them.
 */
export const buildAuthorMeta = (user) => {
  const name = user?.name || user?.email || 'Unknown User';

  return {
    addedBy: name,
    addedByEmail: user?.email || null,
    addedByRole: user?.role || 'vendor', // 'vendor' or 'pm'
    addedAt: new Date().toISOString(),
  };
};

/** Human-readable author line for the info affordances, e.g. "John (PM)". */
export const formatAuthorLine = (data) => {
  const name = data?.addedBy;
  if (!name) return null;

  const roleLabel = data?.addedByRole === 'pm' ? 'PM' : data?.addedByRole === 'client' ? 'Client' : 'Vendor';
  return `${name} (${roleLabel})`;
};

/** Short local date for the authorship popover; never throws on bad input. */
export const formatAddedAt = (value) => {
  if (!value) return 'unknown date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'unknown date';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};
