import React from 'react';
import { Handle, Position } from 'reactflow';
import './nodeHandles.css';

const SIDES = {
  top: Position.Top,
  right: Position.Right,
  bottom: Position.Bottom,
  left: Position.Left,
};

// React Flow falls back to the FIRST handle of a type when an edge has no
// handle id (e.g. edges the AI canvas builder creates), so render the
// preferred side first.
const sideOrder = (first) => [first, ...Object.keys(SIDES).filter((s) => s !== first)];

/**
 * The single set of connection handles used by every canvas node.
 *
 * Every node exposes the same eight ids (`top|right|bottom|left` x `-in|-out`),
 * so an edge never points at a handle the node does not have (React Flow
 * silently drops such edges).
 *
 * `defaultSource` / `defaultTarget` keep legacy edges that carry no handle id
 * attached where each node type used to attach them.
 */
const NodeHandles = ({
  isConnectable = true,
  defaultSource = 'bottom',
  defaultTarget = 'top',
}) => (
  <>
    {sideOrder(defaultTarget).map((side) => (
      <Handle
        key={`${side}-in`}
        type="target"
        position={SIDES[side]}
        id={`${side}-in`}
        isConnectable={isConnectable}
        isConnectableStart={false}
        className="wk-handle wk-handle-legacy"
      />
    ))}
    {sideOrder(defaultSource).map((side) => (
      <Handle
        key={`${side}-out`}
        type="source"
        position={SIDES[side]}
        id={`${side}-out`}
        isConnectable={isConnectable}
        className="wk-handle"
      />
    ))}
  </>
);

export default React.memo(NodeHandles);
