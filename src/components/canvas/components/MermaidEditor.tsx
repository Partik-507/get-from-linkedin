import React, { useState, useEffect, useRef } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { mermaidEditorOpenAtom, mermaidEditingIdAtom, elementsAtom, viewportAtom, currentStrokeColorAtom } from '../state/canvasStore';
import type { MermaidElement } from '../elements/types';
import { newId, randomSeed } from '../utils/geometry';
import { historyManager } from '../engine/history';
import { rtree } from '../engine/rtree';

export const MermaidEditor: React.FC = () => {
  const [open, setOpen] = useAtom(mermaidEditorOpenAtom);
  const [editingId, setEditingId] = useAtom(mermaidEditingIdAtom);
  const [elements, setElements] = useAtom(elementsAtom);
  const viewport = useAtomValue(viewportAtom);
  const strokeColor = useAtomValue(currentStrokeColorAtom);
  const [code, setCode] = useState('flowchart TD\n  A[Start] --> B[Process]\n  B --> C[End]');
  const [previewSvg, setPreviewSvg] = useState('');
  const [error, setError] = useState('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (editingId) {
      const el = elements.find(e => e.id === editingId) as MermaidElement | undefined;
      if (el) setCode(el.code);
    }
  }, [editingId, elements]);

  useEffect(() => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => renderMermaid(code), 500);
  }, [code]);

  const renderMermaid = async (c: string) => {
    try {
      const mermaid = (await import('mermaid')).default;
      mermaid.initialize({ startOnLoad: false, theme: 'dark' });
      const { svg } = await mermaid.render('vc-mermaid-' + Date.now(), c);
      setPreviewSvg(svg);
      setError('');
    } catch (e: any) {
      setError(e.message || 'Invalid Mermaid syntax');
    }
  };

  if (!open) return null;

  const handleConfirm = () => {
    const cx = viewport.x + viewport.width / (2 * viewport.zoom);
    const cy = viewport.y + viewport.height / (2 * viewport.zoom);
    if (editingId) {
      const newEls = elements.map(e => e.id === editingId ? { ...e, code, renderedSvg: previewSvg, version: e.version + 1, updatedAt: Date.now() } : e);
      setElements(newEls); historyManager.push(newEls, 'Edit Mermaid'); rtree.rebuild(newEls);
    } else {
      const el: MermaidElement = {
        id: newId(), type: 'mermaid', x: cx - 200, y: cy - 150, width: 400, height: 300,
        angle: 0, opacity: 100, locked: false, hidden: false, groupId: null, frameId: null,
        zIndex: elements.length, link: null, customData: {}, version: 1,
        updatedAt: Date.now(), createdAt: Date.now(), strokeColor, fillColor: 'transparent',
        fillStyle: 'none', strokeWidth: 1, strokeStyle: 'solid', roughness: 0, roundness: 'none',
        seed: randomSeed(), code, renderedSvg: previewSvg,
      };
      const newEls = [...elements, el];
      setElements(newEls); historyManager.push(newEls, 'Add Mermaid'); rtree.rebuild(newEls);
    }
    setOpen(false); setEditingId(null);
  };

  return (
    <div className="vc-modal-backdrop" onClick={() => setOpen(false)}>
      <div className="vc-modal vc-modal--xl" onClick={e => e.stopPropagation()}>
        <div className="vc-modal-header">
          <h2>Mermaid Diagram</h2>
          <button className="vc-modal-close" onClick={() => { setOpen(false); setEditingId(null); }}>✕</button>
        </div>
        <div className="vc-modal-body" style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <label className="vc-label">Mermaid Code</label>
            <textarea
              className="vc-code-editor"
              value={code}
              onChange={e => setCode(e.target.value)}
              rows={12}
              placeholder="Enter Mermaid syntax…"
            />
            {error && <div className="vc-error-text">{error}</div>}
          </div>
          <div style={{ flex: 1 }}>
            <label className="vc-label">Preview</label>
            <div className="vc-mermaid-preview" dangerouslySetInnerHTML={{ __html: previewSvg || '<p style="color:#888">Preview will appear here…</p>' }} />
          </div>
        </div>
        <div className="vc-modal-footer">
          <button className="vc-btn vc-btn-secondary" onClick={() => { setOpen(false); setEditingId(null); }}>Cancel</button>
          <button className="vc-btn vc-btn-primary" onClick={handleConfirm} disabled={!!error || !previewSvg}>Place on Canvas</button>
        </div>
      </div>
    </div>
  );
};
