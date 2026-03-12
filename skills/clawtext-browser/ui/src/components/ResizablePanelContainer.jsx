/**
 * ResizablePanelContainer
 * 
 * A dynamic, container-aware panel system that:
 * - Expands to fill available parent space (no 100vh assumptions)
 * - Supports resizable dividers between panels
 * - Collapses panels to icon-only when needed
 * - Persists panel sizes in localStorage
 * - Works as a standalone app OR as a dashboard tab
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

export default function ResizablePanelContainer({ 
  children, 
  defaultSizes = [40, 30, 30], // percentages
  persistKey = 'clawtext-browser-layout',
  minHeight = 200,
  onLayoutChange
}) {
  const containerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [sizes, setSizes] = useState(defaultSizes);
  const [isDragging, setIsDragging] = useState(null); // index of divider being dragged
  const dragStartRef = useRef({ x: 0, sizes: [] });

  // Detect container size with ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ width, height });
    });

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Load persisted layout
  useEffect(() => {
    try {
      const saved = localStorage.getItem(persistKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === children.length) {
          setSizes(parsed);
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
  }, [children.length, persistKey]);

  // Save layout on change
  useEffect(() => {
    localStorage.setItem(persistKey, JSON.stringify(sizes));
    if (onLayoutChange) onLayoutChange(sizes);
  }, [sizes, persistKey, onLayoutChange]);

  // Mouse handlers for resizing
  const handleMouseDown = useCallback((index, e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(index);
    dragStartRef.current = {
      x: e.clientX,
      sizes: [...sizes],
    };
  }, [sizes]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging === null || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaPercent = (deltaX / rect.width) * 100;

      const newSizes = [...dragStartRef.current.sizes];
      const prevIndex = isDragging - 1;
      const nextIndex = isDragging;

      // Adjust previous panel
      if (prevIndex >= 0) {
        const prevSize = newSizes[prevIndex] + deltaPercent;
        const nextSize = newSizes[nextIndex] - deltaPercent;

        // Enforce minimum sizes
        const minPanelSize = (minHeight / rect.width) * 100;
        if (prevSize >= minPanelSize && nextSize >= minPanelSize) {
          newSizes[prevIndex] = prevSize;
          newSizes[nextIndex] = nextSize;
        }
      }

      setSizes(newSizes);
    };

    const handleMouseUp = () => {
      setIsDragging(null);
    };

    if (isDragging !== null) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, minHeight]);

  // Render panels with dynamic sizes
  const panelStyles = sizes.map((size, index) => ({
    flex: 'none',
    width: `${size}%`,
    minWidth: `${(minHeight / containerSize.width) * 100}%`,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
  }));

  return (
    <div 
      ref={containerRef} 
      style={{ 
        display: 'flex', 
        width: '100%', 
        height: '100%',
        overflow: 'hidden',
        background: '#0d1117',
      }}
    >
      {children.map((child, index) => (
        <React.Fragment key={index}>
          <div style={panelStyles[index]}>
            {child}
          </div>
          {index < children.length - 1 && (
            <div
              style={{
                width: '4px',
                cursor: 'col-resize',
                background: isDragging === index ? '#58a6ff' : '#30363d',
                transition: 'background 0.15s',
                flex: 'none',
                position: 'relative',
                '&:hover': {
                  background: '#58a6ff66',
                },
              }}
              onMouseDown={(e) => handleMouseDown(index, e)}
              title="Drag to resize"
            >
              <div style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '2px',
                height: '24px',
                background: isDragging === index ? '#58a6ff' : '#6e7681',
                borderRadius: '1px',
              }} />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
