import React, { useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useDrag, useDrop } from 'react-dnd';

// Draggable Component
const DraggableItem = ({ item }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'TEST_ELEMENT',
    item: item,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={drag}
      style={{
        padding: '12px 16px',
        margin: '8px',
        backgroundColor: isDragging ? '#93c5fd' : '#3b82f6',
        color: 'white',
        borderRadius: '8px',
        cursor: 'move',
        opacity: isDragging ? 0.5 : 1,
        transform: isDragging ? 'scale(0.95)' : 'scale(1)',
        transition: 'all 0.2s',
        fontWeight: '500',
      }}
    >
      {item.icon} {item.name}
    </div>
  );
};

// Drop Zone Component
const DropZone = () => {
  const [droppedItems, setDroppedItems] = useState([]);

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'TEST_ELEMENT',
    drop: (item, monitor) => {
      const offset = monitor.getClientOffset();
      const dropZoneElement = document.getElementById('test-drop-zone');
      if (offset && dropZoneElement) {
        const rect = dropZoneElement.getBoundingClientRect();
        const x = offset.x - rect.left;
        const y = offset.y - rect.top;

        const newItem = {
          ...item,
          id: Date.now(),
          position: { x, y }
        };

        setDroppedItems(prev => [...prev, newItem]);
        console.log('✅ Item dropped:', item.name, 'at', { x: Math.round(x), y: Math.round(y) });
        return { dropped: true };
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const isActive = isOver && canDrop;

  return (
    <div
      ref={drop}
      id="test-drop-zone"
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '400px',
        border: isActive ? '3px dashed #3b82f6' : '2px dashed #d1d5db',
        borderRadius: '12px',
        backgroundColor: isActive ? '#dbeafe' : '#f9fafb',
        transition: 'all 0.3s',
        padding: '20px',
      }}
    >
      {droppedItems.length === 0 && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: '#9ca3af',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>🎯</div>
          <h3 style={{ margin: '10px 0' }}>Drop Zone</h3>
          <p>Drag elements here to test React DnD</p>
        </div>
      )}

      {isActive && (
        <div style={{
          position: 'absolute',
          inset: '20px',
          border: '3px dashed #2563eb',
          borderRadius: '8px',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
        }}>
          <div style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '18px',
          }}>
            Drop Here!
          </div>
        </div>
      )}

      {droppedItems.map(item => (
        <div
          key={item.id}
          style={{
            position: 'absolute',
            left: `${item.position.x - 50}px`,
            top: `${item.position.y - 20}px`,
            padding: '8px 16px',
            backgroundColor: '#10b981',
            color: 'white',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          }}
        >
          {item.icon} {item.name}
        </div>
      ))}
    </div>
  );
};

// Main Test Component
const TestDragDrop = () => {
  const [logs, setLogs] = useState(['Test interface initialized']);

  React.useEffect(() => {
    // Override console.log to capture logs
    const originalLog = console.log;
    console.log = (...args) => {
      originalLog(...args);
      setLogs(prev => [...prev, args.join(' ')]);
    };

    return () => {
      console.log = originalLog;
    };
  }, []);

  const testItems = [
    { name: 'TextArea', type: 'form', icon: '📝' },
    { name: 'Button', type: 'form', icon: '🔘' },
    { name: 'Input', type: 'form', icon: '📋' },
    { name: 'Table', type: 'table', icon: '📊' },
    { name: 'Chart', type: 'chart', icon: '📈' },
    { name: 'Image', type: 'media', icon: '🖼️' },
  ];

  return (
    <DndProvider backend={HTML5Backend}>
      <div style={{ padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '30px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
        }}>
          <h1 style={{ marginBottom: '10px' }}>🧪 React DnD Test Interface</h1>
          <p style={{ color: '#6b7280', marginBottom: '30px' }}>
            Test the React DnD implementation with visual feedback
          </p>

          {/* Status Bar */}
          <div style={{
            backgroundColor: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '20px',
          }}>
            <h3 style={{ marginBottom: '10px' }}>✅ React DnD Status</h3>
            <div style={{ display: 'flex', gap: '20px', fontSize: '14px' }}>
              <span>📦 Provider: Active</span>
              <span>🎯 Drop Target: Ready</span>
              <span>🔄 HTML5 Backend: Loaded</span>
            </div>
          </div>

          {/* Main Test Area */}
          <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '30px' }}>
            {/* Draggable Elements */}
            <div>
              <h2 style={{ marginBottom: '15px', fontSize: '18px' }}>
                📦 Draggable Elements
              </h2>
              <div style={{
                backgroundColor: '#f9fafb',
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                padding: '10px',
              }}>
                {testItems.map((item, index) => (
                  <DraggableItem key={index} item={item} />
                ))}
              </div>
            </div>

            {/* Drop Zone */}
            <div>
              <h2 style={{ marginBottom: '15px', fontSize: '18px' }}>
                🎯 Canvas Drop Zone
              </h2>
              <DropZone />
            </div>
          </div>

          {/* Console Output */}
          <div style={{
            marginTop: '30px',
            backgroundColor: '#1f2937',
            color: '#10b981',
            padding: '15px',
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '12px',
            maxHeight: '150px',
            overflowY: 'auto',
          }}>
            <div style={{ marginBottom: '5px', color: '#6b7280' }}>// Console Output:</div>
            {logs.map((log, index) => (
              <div key={index} style={{ marginBottom: '3px' }}>
                {'>'} {log}
              </div>
            ))}
          </div>

          {/* Instructions */}
          <div style={{
            marginTop: '20px',
            backgroundColor: '#fef3c7',
            border: '1px solid #fbbf24',
            borderRadius: '8px',
            padding: '15px',
          }}>
            <h3 style={{ marginBottom: '10px' }}>📝 How to Test:</h3>
            <ol style={{ marginLeft: '20px', lineHeight: '1.6' }}>
              <li>Drag any element from the left panel</li>
              <li>The element should become semi-transparent while dragging</li>
              <li>Hover over the drop zone - it should highlight in blue</li>
              <li>A "Drop Here!" message should appear</li>
              <li>Drop the element - it should appear at the exact position</li>
              <li>Check console output for confirmation</li>
            </ol>
          </div>
        </div>
      </div>
    </DndProvider>
  );
};

export default TestDragDrop;
