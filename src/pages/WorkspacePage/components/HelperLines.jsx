import React from 'react';
import { useViewport } from 'reactflow';

/**
 * HelperLines — renders smart alignment guides inside the ReactFlow canvas.
 * `horizontal`/`vertical` are flow-space coordinates; converted to screen space
 * via the current viewport transform.
 */
const HelperLines = ({ horizontal = null, vertical = null }) => {
  const { x, y, zoom } = useViewport();

  if (horizontal == null && vertical == null) return null;

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 9 }}>
      {vertical != null && (
        <div
          className="absolute top-0 bottom-0 bg-info"
          style={{ left: vertical * zoom + x, width: 1 }}
        />
      )}
      {horizontal != null && (
        <div
          className="absolute left-0 right-0 bg-info"
          style={{ top: horizontal * zoom + y, height: 1 }}
        />
      )}
    </div>
  );
};

export default HelperLines;
