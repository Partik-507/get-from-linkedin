import React from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { viewportAtom, elementsAtom, isSavedAtom } from '../state/canvasStore';
import { zoomAtPoint, fitToElements } from '../engine/viewport';

export const BottomBar: React.FC = () => {
  const [viewport, setViewport] = useAtom(viewportAtom);
  const elements = useAtomValue(elementsAtom);
  const isSaved = useAtomValue(isSavedAtom);
  const [cursorPos, setCursorPos] = React.useState({ x: 0, y: 0 });

  const zoomPct = Math.round(viewport.zoom * 100);

  const handleZoomIn = () => setViewport(vp => zoomAtPoint(vp, vp.zoom * 1.2, { x: vp.width / 2, y: vp.height / 2 }));
  const handleZoomOut = () => setViewport(vp => zoomAtPoint(vp, vp.zoom * 0.8, { x: vp.width / 2, y: vp.height / 2 }));
  const handleReset = () => setViewport(vp => ({ ...vp, zoom: 1, x: 0, y: 0 }));
  const handleFit = () => {
    if (elements.length === 0) return;
    setViewport(vp => fitToElements(elements, vp.width, vp.height));
  };

  React.useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const canvas = document.querySelector('.vc-canvas') as HTMLCanvasElement;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      setCursorPos({
        x: Math.round((e.clientX - rect.left) / viewport.zoom + viewport.x),
        y: Math.round((e.clientY - rect.top) / viewport.zoom + viewport.y),
      });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [viewport]);

  return (
    <div className="vc-bottombar">
      <div className="vc-bottombar-left">
        <button className="vc-bottombar-btn" onClick={handleZoomOut} title="Zoom out">−</button>
        <button className="vc-bottombar-zoom" title="Click to reset zoom" onClick={handleReset}>
          {zoomPct}%
        </button>
        <button className="vc-bottombar-btn" onClick={handleZoomIn} title="Zoom in">+</button>
        <button className="vc-bottombar-btn" onClick={handleFit} title="Fit to screen">Fit</button>
        <button className="vc-bottombar-btn" onClick={handleReset} title="Reset to 100%">100%</button>
      </div>
      <div className="vc-bottombar-center">
        <span className="vc-cursor-pos">{cursorPos.x}, {cursorPos.y}</span>
      </div>
      <div className="vc-bottombar-right">
        <span className="vc-element-count">{elements.length} elements</span>
        <span className={`vc-save-status ${isSaved ? 'vc-saved' : 'vc-unsaved'}`}>
          {isSaved ? '✓ Saved' : '● Unsaved'}
        </span>
      </div>
    </div>
  );
};
