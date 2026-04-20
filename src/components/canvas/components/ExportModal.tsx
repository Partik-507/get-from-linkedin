import React, { useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { exportModalOpenAtom, elementsAtom, backgroundColorAtom, canvasNameAtom } from '../state/canvasStore';
import type { AnyElement } from '../elements/types';
import { renderElement, renderGrid } from '../elements/renderer';

type Format = 'png' | 'svg' | 'pdf' | 'json' | 'excalidraw';
type Scale = '1x' | '2x' | '4x';

export const ExportModal: React.FC = () => {
  const [open, setOpen] = useAtom(exportModalOpenAtom);
  const elements = useAtomValue(elementsAtom);
  const bgColor = useAtomValue(backgroundColorAtom);
  const canvasName = useAtomValue(canvasNameAtom);
  const [format, setFormat] = useState<Format>('png');
  const [scale, setScale] = useState<Scale>('2x');
  const [includeBg, setIncludeBg] = useState(true);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const getScaleNum = () => scale === '1x' ? 1 : scale === '2x' ? 2 : 4;

  const exportPNG = async () => {
    setLoading(true);
    const s = getScaleNum();
    const visible = elements.filter(el => !el.hidden);
    if (visible.length === 0) { setLoading(false); return; }
    const minX = Math.min(...visible.map(e => e.x)) - 20;
    const minY = Math.min(...visible.map(e => e.y)) - 20;
    const maxX = Math.max(...visible.map(e => e.x + e.width)) + 20;
    const maxY = Math.max(...visible.map(e => e.y + e.height)) + 20;
    const w = (maxX - minX) * s;
    const h = (maxY - minY) * s;
    const offscreen = document.createElement('canvas');
    offscreen.width = w;
    offscreen.height = h;
    const ctx = offscreen.getContext('2d')!;
    if (includeBg) { ctx.fillStyle = bgColor; ctx.fillRect(0, 0, w, h); }
    ctx.setTransform(s, 0, 0, s, -minX * s, -minY * s);
    visible.sort((a, b) => a.zIndex - b.zIndex).forEach(el => renderElement(ctx, el, false, s));
    offscreen.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${canvasName}.png`; a.click();
      URL.revokeObjectURL(url);
      setLoading(false);
    }, 'image/png');
  };

  const exportJSON = () => {
    const data = JSON.stringify({ type: format === 'excalidraw' ? 'excalidraw' : 'vivavault', elements, version: 1 }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${canvasName}.${format === 'excalidraw' ? 'excalidraw' : 'json'}`; a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  const handleExport = async () => {
    if (format === 'png') await exportPNG();
    else if (format === 'json' || format === 'excalidraw') exportJSON();
    setOpen(false);
  };

  return (
    <div className="vc-modal-backdrop" onClick={() => setOpen(false)}>
      <div className="vc-modal" onClick={e => e.stopPropagation()}>
        <div className="vc-modal-header">
          <h2>Export Canvas</h2>
          <button className="vc-modal-close" onClick={() => setOpen(false)}>✕</button>
        </div>
        <div className="vc-modal-body">
          <label className="vc-label">Format</label>
          <div className="vc-btn-row">
            {(['png', 'svg', 'pdf', 'json', 'excalidraw'] as Format[]).map(f => (
              <button key={f} className={`vc-chip${format === f ? ' vc-chip--active' : ''}`} onClick={() => setFormat(f)}>{f.toUpperCase()}</button>
            ))}
          </div>
          {(format === 'png') && (
            <>
              <label className="vc-label">Scale</label>
              <div className="vc-btn-row">
                {(['1x', '2x', '4x'] as Scale[]).map(s => (
                  <button key={s} className={`vc-chip${scale === s ? ' vc-chip--active' : ''}`} onClick={() => setScale(s)}>{s}</button>
                ))}
              </div>
              <label className="vc-label">Background</label>
              <div className="vc-btn-row">
                <button className={`vc-chip${includeBg ? ' vc-chip--active' : ''}`} onClick={() => setIncludeBg(true)}>Include</button>
                <button className={`vc-chip${!includeBg ? ' vc-chip--active' : ''}`} onClick={() => setIncludeBg(false)}>Transparent</button>
              </div>
            </>
          )}
        </div>
        <div className="vc-modal-footer">
          <button className="vc-btn vc-btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
          <button className="vc-btn vc-btn-primary" onClick={handleExport} disabled={loading}>
            {loading ? 'Exporting…' : 'Download ↓'}
          </button>
        </div>
      </div>
    </div>
  );
};
