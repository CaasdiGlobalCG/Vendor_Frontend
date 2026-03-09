import React, { useMemo } from 'react';

/**
 * RemoteCursor — Renders another user's cursor position on the canvas.
 * Displays a colored pointer with the user's name label.
 */

// Generate a consistent color from a userId string
function userColor(userId) {
  const colors = [
    '#e74c3c', // red
    '#3498db', // blue
    '#2ecc71', // green
    '#f39c12', // orange
    '#9b59b6', // purple
    '#1abc9c', // teal
    '#e67e22', // dark orange
    '#e84393', // pink
  ];
  let hash = 0;
  for (let i = 0; i < (userId || '').length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

const RemoteCursor = React.memo(({ userId, userName, x, y }) => {
  const color = useMemo(() => userColor(userId), [userId]);

  if (x == null || y == null) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: x,
        top: y,
        pointerEvents: 'none',
        zIndex: 9999,
        transform: 'translate(-2px, -2px)',
        transition: 'left 0.1s linear, top 0.1s linear',
      }}
    >
      {/* Cursor arrow SVG */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M3 3L10 17L12 10L19 8L3 3Z"
          fill={color}
          stroke="white"
          strokeWidth="1"
        />
      </svg>

      {/* Name label */}
      <div
        style={{
          position: 'absolute',
          top: 18,
          left: 8,
          backgroundColor: color,
          color: 'white',
          fontSize: '11px',
          fontWeight: 500,
          padding: '1px 6px',
          borderRadius: '4px',
          whiteSpace: 'nowrap',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          lineHeight: '16px',
        }}
      >
        {userName || 'User'}
      </div>
    </div>
  );
});

RemoteCursor.displayName = 'RemoteCursor';

export default RemoteCursor;
