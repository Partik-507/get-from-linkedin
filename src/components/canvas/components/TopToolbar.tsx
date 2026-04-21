import React, { useState, useEffect, useRef } from 'react';
import { useAtom } from 'jotai';
import { motion } from 'framer-motion';
import { GripVertical } from 'lucide-react';
import { activeToolAtom, isLockedAtom } from '../state/canvasStore';
import type { Tool } from '../elements/types';

const toolGroups: { tools: { id: Tool; icon: string; label: string; key: string }[]; }[] = [
  { tools: [
    { id: 'lock', icon: '🔒', label: 'Lock', key: 'Esc' },
    { id: 'hand', icon: '✋', label: 'Hand', key: 'H' },
    { id: 'select', icon: '↖', label: 'Select', key: 'V' },
  ]},
  { tools: [
    { id: 'rectangle', icon: '▭', label: 'Rectangle', key: 'R' },
    { id: 'diamond', icon: '◇', label: 'Diamond', key: 'D' },
    { id: 'ellipse', icon: '○', label: 'Ellipse', key: 'O' },
    { id: 'triangle', icon: '△', label: 'Triangle', key: 'T' },
  ]},
  { tools: [
    { id: 'arrow', icon: '→', label: 'Arrow', key: 'A' },
    { id: 'line', icon: '╱', label: 'Line', key: 'L' },
    { id: 'freedraw', icon: '✏', label: 'Draw', key: 'P' },
  ]},
  { tools: [
    { id: 'text', icon: 'T', label: 'Text', key: 'T' },
    { id: 'sticky-note', icon: '📝', label: 'Sticky', key: 'S' },
    { id: 'table', icon: '⊞', label: 'Table', key: 'B' },
    { id: 'frame', icon: '⬚', label: 'Frame', key: 'F' },
  ]},
  { tools: [
    { id: 'image', icon: '🖼', label: 'Image', key: 'I' },
    { id: 'embed', icon: '<>', label: 'Embed', key: 'W' },
    { id: 'latex', icon: '∑', label: 'LaTeX', key: 'M' },
    { id: 'mermaid', icon: '⌘', label: 'Mermaid', key: 'G' },
  ]},
  { tools: [
    { id: 'eraser', icon: '⌫', label: 'Eraser', key: 'E' },
    { id: 'library', icon: '📚', label: 'Library', key: '0' },
  ]},
];

const moreShapes: { id: Tool; label: string }[] = [
  { id: 'star', label: 'Star' }, { id: 'pentagon', label: 'Pentagon' },
  { id: 'hexagon', label: 'Hexagon' }, { id: 'octagon', label: 'Octagon' },
  { id: 'parallelogram', label: 'Parallelogram' }, { id: 'trapezoid', label: 'Trapezoid' },
  { id: 'cylinder', label: 'Cylinder' }, { id: 'callout', label: 'Callout' },
  { id: 'cloud', label: 'Cloud' }, { id: 'cross', label: 'Cross' },
  { id: 'database', label: 'Database' }, { id: 'zone', label: 'Zone' },
];

export const TopToolbar: React.FC = () => {
  const [activeTool, setActiveTool] = useAtom(activeToolAtom);
  const [isLocked] = useAtom(isLockedAtom);
  const [showMoreShapes, setShowMoreShapes] = useState(false);
  const [tooltip, setTooltip] = useState<{ id: string; label: string; key: string } | null>(null);
  const tooltipTimer = React.useRef<ReturnType<typeof setTimeout>>();
  const constraintsRef = useRef<HTMLDivElement>(null);

  // Persist toolbar position
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    try { return JSON.parse(localStorage.getItem('vc_toolbar_pos') || '{"x":0,"y":0}'); }
    catch { return { x: 0, y: 0 }; }
  });

  useEffect(() => {
    // Set up constraints to viewport
    constraintsRef.current = document.body as any;
  }, []);

  const handleTool = (id: Tool) => {
    setActiveTool(id);
    setShowMoreShapes(false);
  };

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0}
      initial={pos}
      onDragEnd={(_, info) => {
        const next = { x: pos.x + info.offset.x, y: pos.y + info.offset.y };
        setPos(next);
        try { localStorage.setItem('vc_toolbar_pos', JSON.stringify(next)); } catch {}
      }}
      style={{ touchAction: 'none' }}
      className="vc-toolbar"
    >
      {/* Drag grip handle */}
      <div
        className="vc-toolbar-grip"
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 6px',
          cursor: 'grab',
          color: 'hsl(var(--muted-foreground))',
        }}
        title="Drag to move toolbar"
      >
        <GripVertical size={14} />
      </div>
      <div className="vc-toolbar-divider" />
      {toolGroups.map((group, gi) => (
        <React.Fragment key={gi}>
          {gi > 0 && <div className="vc-toolbar-divider" />}
          {group.tools.map(t => (
            <div key={t.id} className="vc-toolbar-item-wrap" style={{ position: 'relative' }}>
              <button
                className={`vc-toolbar-btn${activeTool === t.id ? ' vc-toolbar-btn--active' : ''}`}
                onClick={() => handleTool(t.id)}
                onMouseEnter={() => {
                  clearTimeout(tooltipTimer.current);
                  tooltipTimer.current = setTimeout(() => setTooltip(t), 400);
                }}
                onMouseLeave={() => { clearTimeout(tooltipTimer.current); setTooltip(null); }}
                aria-label={`${t.label} (${t.key})`}
                title=""
              >
                <span className="vc-toolbar-icon">{t.icon}</span>
              </button>
              {tooltip?.id === t.id && (
                <div className="vc-tooltip">
                  <span>{t.label}</span>
                  <kbd className="vc-tooltip-key">{t.key}</kbd>
                </div>
              )}
            </div>
          ))}
          {gi === 1 && (
            <div style={{ position: 'relative' }}>
              <button className="vc-toolbar-btn" onClick={() => setShowMoreShapes(s => !s)} title="More shapes">
                <span className="vc-toolbar-icon">▾</span>
              </button>
              {showMoreShapes && (
                <div className="vc-more-shapes-popup">
                  {moreShapes.map(s => (
                    <button key={s.id} className={`vc-more-shape-btn${activeTool === s.id ? ' vc-toolbar-btn--active' : ''}`} onClick={() => handleTool(s.id)}>
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </React.Fragment>
      ))}
    </motion.div>
  );
};
