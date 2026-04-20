import React, { useEffect, useRef } from 'react';
import { useAtomValue, useAtom } from 'jotai';
import { elementsAtom, viewportAtom, showMinimapAtom, backgroundColorAtom } from '../state/canvasStore';
import { renderElement } from '../elements/renderer';

export const Minimap: React.FC = () => {
  const [show] = useAtom(showMinimapAtom);
  const elements = useAtomValue(elementsAtom);
  const [viewport, setViewport] = useAtom(viewportAtom);
  const bgColor = useAtomValue(backgroundColorAtom);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const W = 200, H = 150;

  useEffect(() => {
    if (!show || !canvasRef.current || elements.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    canvas.width = W; canvas.height = H;
    const visible = elements.filter(el => !el.hidden);
    if (visible.length === 0) return;
    const minX = Math.min(...visible.map(e => e.x));
    const minY = Math.min(...visible.map(e => e.y));
    const maxX = Math.max(...visible.map(e => e.x + e.width));
    const maxY = Math.max(...visible.map(e => e.y + e.height));
    const sceneW = maxX - minX || 1, sceneH = maxY - minY || 1;
    const scale = Math.min(W / sceneW, H / sceneH) * 0.8;
    const ox = (W - sceneW * scale) / 2 - minX * scale;
    const oy = (H - sceneH * scale) / 2 - minY * scale;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, W, H);
    ctx.setTransform(scale, 0, 0, scale, ox, oy);
    visible.sort((a, b) => a.zIndex - b.zIndex).forEach(el => renderElement(ctx, el, false, scale));
    ctx.resetTransform();
    // viewport rect
    const vx = viewport.x * scale + ox, vy = viewport.y * scale + oy;
    const vw = (viewport.width / viewport.zoom) * scale, vh = (viewport.height / viewport.zoom) * scale;
    ctx.strokeStyle = 'rgba(124,58,237,0.8)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(vx, vy, vw, vh);
    ctx.fillStyle = 'rgba(124,58,237,0.1)';
    ctx.fillRect(vx, vy, vw, vh);
  }, [show, elements, viewport, bgColor]);

  const handleClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    const visible = elements.filter(el => !el.hidden);
    if (visible.length === 0) return;
    const minX = Math.min(...visible.map(e => e.x));
    const minY = Math.min(...visible.map(e => e.y));
    const maxX = Math.max(...visible.map(e => e.x + e.width));
    const maxY = Math.max(...visible.map(e => e.y + e.height));
    const sceneW = maxX - minX || 1, sceneH = maxY - minY || 1;
    const scale = Math.min(W / sceneW, H / sceneH) * 0.8;
    const ox = (W - sceneW * scale) / 2 - minX * scale;
    const oy = (H - sceneH * scale) / 2 - minY * scale;
    const worldX = (px - ox) / scale - viewport.width / (2 * viewport.zoom);
    const worldY = (py - oy) / scale - viewport.height / (2 * viewport.zoom);
    setViewport(vp => ({ ...vp, x: worldX, y: worldY }));
  };

  if (!show) return null;

  return (
    <div className="vc-minimap">
      <canvas ref={canvasRef} onClick={handleClick} style={{ cursor: 'crosshair' }} />
    </div>
  );
};
