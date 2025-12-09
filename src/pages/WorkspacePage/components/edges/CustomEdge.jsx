import React from 'react';

const CustomEdge = ({ 
  id, 
  sourceX, 
  sourceY, 
  targetX, 
  targetY, 
  sourcePosition, 
  targetPosition,
  style = {},
  data,
  markerEnd
}) => {
  const edgePath = `M${sourceX},${sourceY} C${sourceX + 50},${sourceY} ${targetX - 50},${targetY} ${targetX},${targetY}`;
  
  return (
    <>
      <path
        id={id}
        style={style}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
        strokeWidth={2}
        stroke="#6b7280"
        fill="none"
      />
      {/* Edge Label */}
      {data?.label && (
        <text>
          <textPath href={`#${id}`} style={{ fontSize: 12 }} startOffset="50%" textAnchor="middle">
            {data.label}
          </textPath>
        </text>
      )}
    </>
  );
};

export default CustomEdge;



