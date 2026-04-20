import React, { useEffect, useCallback } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { presentationModeAtom, presentationFrameIndexAtom, elementsAtom } from '../state/canvasStore';
import type { FrameElement } from '../elements/types';
import { renderElement } from '../elements/renderer';

export const PresentationMode: React.FC = () => {
  const [active, setActive] = useAtom(presentationModeAtom);
  const [frameIndex, setFrameIndex] = useAtom(presentationFrameIndexAtom);
  const elements = useAtomValue(elementsAtom);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const frames = elements.filter(el => el.type === 'frame' && (el as FrameElement).inPresentation !== false) as FrameElement[];

  const renderFrame = useCallback((frame: FrameElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const scaleX = window.innerWidth / frame.width;
    const scaleY = window.innerHeight / frame.height;
    const scale = Math.min(scaleX, scaleY);
    const offsetX = (window.innerWidth - frame.width * scale) / 2;
    const offsetY = (window.innerHeight - frame.height * scale) / 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, offsetX - frame.x * scale, offsetY - frame.y * scale);
    elements.filter(el => el.frameId === frame.id || (el.x >= frame.x && el.y >= frame.y && el.x + el.width <= frame.x + frame.width && el.y + el.height <= frame.y + frame.height))
      .sort((a, b) => a.zIndex - b.zIndex)
      .forEach(el => renderElement(ctx, el, false, scale));
  }, [elements]);

  useEffect(() => {
    if (active && frames[frameIndex]) renderFrame(frames[frameIndex]);
  }, [active, frameIndex, frames, renderFrame]);

  const next = () => setFrameIndex(i => Math.min(i + 1, frames.length - 1));
  const prev = () => setFrameIndex(i => Math.max(i - 1, 0));

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (!active) return;
    if (e.key === 'ArrowRight' || e.key === ' ') next();
    else if (e.key === 'ArrowLeft' || e.key === 'Backspace') prev();
    else if (e.key === 'Escape') setActive(false);
  }, [active, next, prev]);

  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  if (!active || frames.length === 0) return null;

  return (
    <div className="vc-presentation">
      <canvas ref={canvasRef} className="vc-presentation-canvas" />
      <div className="vc-presentation-hud">
        <button className="vc-pres-btn" onClick={prev} disabled={frameIndex === 0}>←</button>
        <span className="vc-pres-counter">{frameIndex + 1} / {frames.length}</span>
        <button className="vc-pres-btn" onClick={next} disabled={frameIndex === frames.length - 1}>→</button>
        <button className="vc-pres-btn vc-pres-exit" onClick={() => setActive(false)}>✕ Exit</button>
      </div>
    </div>
  );
};
