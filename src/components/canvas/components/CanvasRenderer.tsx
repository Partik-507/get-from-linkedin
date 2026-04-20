import React, { useRef, useEffect, useCallback } from 'react';
import { useAtomValue, useAtom } from 'jotai';
import {
  elementsAtom, viewportAtom, selectedIdsAtom, drawingPreviewAtom,
  gridEnabledAtom, gridStepAtom, gridStyleAtom, backgroundColorAtom,
  themeAtom, activeToolAtom, snapGuidesAtom,
} from '../state/canvasStore';
import { renderElement, renderGrid } from '../elements/renderer';
import { getViewportBounds } from '../engine/viewport';
import { rtree } from '../engine/rtree';
import { useCanvasInteraction } from '../engine/canvasEngine';
import type { AnyElement } from '../elements/types';

export const CanvasRenderer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>();
  const isDirtyRef = useRef(true);

  const elements = useAtomValue(elementsAtom);
  const [viewport, setViewport] = useAtom(viewportAtom);
  const selectedIds = useAtomValue(selectedIdsAtom);
  const drawingPreview = useAtomValue(drawingPreviewAtom);
  const gridEnabled = useAtomValue(gridEnabledAtom);
  const gridStep = useAtomValue(gridStepAtom);
  const gridStyle = useAtomValue(gridStyleAtom);
  const bgColor = useAtomValue(backgroundColorAtom);
  const theme = useAtomValue(themeAtom);
  const activeTool = useAtomValue(activeToolAtom);
  const snapGuides = useAtomValue(snapGuidesAtom);

  const { onPointerDown, onPointerMove, onPointerUp, onWheel, onDoubleClick, onContextMenu } = useCanvasInteraction(canvasRef as React.RefObject<HTMLCanvasElement>);

  // Rebuild r-tree when elements change
  useEffect(() => {
    rtree.rebuild(elements);
    isDirtyRef.current = true;
  }, [elements]);

  useEffect(() => { isDirtyRef.current = true; }, [viewport, selectedIds, drawingPreview, gridEnabled, bgColor]);

  // Main render loop
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isDirtyRef.current) {
      animRef.current = requestAnimationFrame(renderFrame);
      return;
    }
    isDirtyRef.current = false;
    const ctx = canvas.getContext('2d')!;
    const { x: vpX, y: vpY, zoom, width, height } = viewport;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Reset to identity, scale by DPR, then clear in CSS-pixel space
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // Apply viewport (zoom + pan), pre-multiplied with DPR
    ctx.setTransform(zoom * dpr, 0, 0, zoom * dpr, -vpX * zoom * dpr, -vpY * zoom * dpr);

    // Grid
    if (gridEnabled) {
      renderGrid(ctx, viewport, gridStep, gridStyle, theme);
    }

    // Snap guides
    for (const guide of snapGuides) {
      ctx.strokeStyle = '#7C3AED';
      ctx.lineWidth = 1 / zoom;
      ctx.setLineDash([4 / zoom, 4 / zoom]);
      ctx.beginPath();
      if (guide.x !== undefined) { ctx.moveTo(guide.x, vpY); ctx.lineTo(guide.x, vpY + height / zoom); }
      if (guide.y !== undefined) { ctx.moveTo(vpX, guide.y); ctx.lineTo(vpX + width / zoom, guide.y); }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Elements
    const bounds = getViewportBounds(viewport);
    const visibleIds = new Set(rtree.query(bounds.minX, bounds.minY, bounds.maxX, bounds.maxY));
    const visibleEls = elements.filter(el => visibleIds.has(el.id) || selectedIds.has(el.id)).sort((a, b) => a.zIndex - b.zIndex);

    for (const el of visibleEls) {
      renderElement(ctx, el, selectedIds.has(el.id), zoom);
    }

    // Drawing preview
    if (drawingPreview) {
      renderElement(ctx, drawingPreview, false, zoom);
    }

    animRef.current = requestAnimationFrame(renderFrame);
  }, [viewport, elements, selectedIds, drawingPreview, gridEnabled, gridStep, gridStyle, bgColor, theme, snapGuides]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(renderFrame);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [renderFrame]);

  // Resize observer (DPR-aware; render loop bakes DPR into setTransform)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      const { width, height } = entry.contentRect;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      setViewport(vp => ({ ...vp, width, height }));
      isDirtyRef.current = true;
    });
    observer.observe(canvas.parentElement || canvas);
    return () => observer.disconnect();
  }, [setViewport]);

  // Event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('dblclick', onDoubleClick);
    canvas.addEventListener('contextmenu', onContextMenu);
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('dblclick', onDoubleClick);
      canvas.removeEventListener('contextmenu', onContextMenu);
    };
  }, [onPointerDown, onPointerMove, onPointerUp, onWheel, onDoubleClick, onContextMenu]);

  const getCursor = () => {
    switch (activeTool) {
      case 'hand': return 'grab';
      case 'text': return 'text';
      case 'eraser': return 'cell';
      case 'select': return 'default';
      default: return 'crosshair';
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className="vc-canvas"
      style={{ display: 'block', width: '100%', height: '100%', cursor: getCursor(), touchAction: 'none' }}
    />
  );
};
