import React, { useState, useEffect } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { addToPageModalOpenAtom, elementsAtom, backgroundColorAtom, canvasIdAtom, canvasNameAtom, selectedIdsAtom } from '../state/canvasStore';
import { renderElement } from '../elements/renderer';

interface Props {
  onAddToPage?: (imageBlob: Blob, canvasId: string, caption: string) => void;
  pages?: { id: string; title: string }[];
}

export const AddToPageModal: React.FC<Props> = ({ onAddToPage, pages = [] }) => {
  const [open, setOpen] = useAtom(addToPageModalOpenAtom);
  const elements = useAtomValue(elementsAtom);
  const bgColor = useAtomValue(backgroundColorAtom);
  const canvasId = useAtomValue(canvasIdAtom);
  const canvasName = useAtomValue(canvasNameAtom);
  const selectedIds = useAtomValue(selectedIdsAtom);
  const [preview, setPreview] = useState<string | null>(null);
  const [mode, setMode] = useState<'full' | 'selection'>(selectedIds.size > 0 ? 'selection' : 'full');
  const [scale, setScale] = useState<'1x' | '2x' | '4x'>('2x');
  const [includeBg, setIncludeBg] = useState(true);
  const [caption, setCaption] = useState('');
  const [step, setStep] = useState<'options' | 'page-select'>('options');
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [pageSearch, setPageSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) generatePreview();
  }, [open, mode]);

  const generatePreview = async () => {
    const s = scale === '1x' ? 1 : scale === '2x' ? 2 : 4;
    const visible = (mode === 'selection' && selectedIds.size > 0)
      ? elements.filter(el => selectedIds.has(el.id) && !el.hidden)
      : elements.filter(el => !el.hidden);
    if (visible.length === 0) return;
    const minX = Math.min(...visible.map(e => e.x)) - 20;
    const minY = Math.min(...visible.map(e => e.y)) - 20;
    const maxX = Math.max(...visible.map(e => e.x + e.width)) + 20;
    const maxY = Math.max(...visible.map(e => e.y + e.height)) + 20;
    const w = Math.min((maxX - minX) * s, 2000);
    const h = Math.min((maxY - minY) * s, 1500);
    const offscreen = document.createElement('canvas');
    offscreen.width = w; offscreen.height = h;
    const ctx = offscreen.getContext('2d')!;
    if (includeBg) { ctx.fillStyle = bgColor; ctx.fillRect(0, 0, w, h); }
    ctx.setTransform(s, 0, 0, s, -minX * s, -minY * s);
    visible.sort((a, b) => a.zIndex - b.zIndex).forEach(el => renderElement(ctx, el, false, s));
    setPreview(offscreen.toDataURL('image/png'));
  };

  const handleAddToPage = async () => {
    if (!selectedPage || !preview) return;
    setLoading(true);
    const blob = await (await fetch(preview)).blob();
    onAddToPage?.(blob, canvasId, caption);
    setLoading(false);
    setOpen(false);
    setStep('options');
  };

  if (!open) return null;

  const filteredPages = pages.filter(p => p.title.toLowerCase().includes(pageSearch.toLowerCase()));

  return (
    <div className="vc-modal-backdrop" onClick={() => setOpen(false)}>
      <div className="vc-modal vc-modal--large" onClick={e => e.stopPropagation()}>
        <div className="vc-modal-header">
          {step === 'page-select' && <button className="vc-btn-ghost" onClick={() => setStep('options')}>← Back</button>}
          <h2>{step === 'options' ? 'Add to Page' : 'Choose a page'}</h2>
          <button className="vc-modal-close" onClick={() => setOpen(false)}>✕</button>
        </div>
        <div className="vc-modal-body">
          {step === 'options' ? (
            <>
              {preview && <img src={preview} alt="Preview" className="vc-export-preview" />}
              <label className="vc-label">Capture</label>
              <div className="vc-btn-row">
                <button className={`vc-chip${mode === 'full' ? ' vc-chip--active' : ''}`} onClick={() => setMode('full')}>Entire Canvas</button>
                <button className={`vc-chip${mode === 'selection' ? ' vc-chip--active' : ''}`} onClick={() => setMode('selection')} disabled={selectedIds.size === 0}>Selection Only</button>
              </div>
              <label className="vc-label">Resolution</label>
              <div className="vc-btn-row">
                {(['1x', '2x', '4x'] as const).map(s => <button key={s} className={`vc-chip${scale === s ? ' vc-chip--active' : ''}`} onClick={() => setScale(s)}>{s}</button>)}
              </div>
              <label className="vc-label">Caption</label>
              <input type="text" className="vc-input" value={caption} onChange={e => setCaption(e.target.value)} placeholder="Optional caption…" />
            </>
          ) : (
            <>
              <input type="text" className="vc-input" value={pageSearch} onChange={e => setPageSearch(e.target.value)} placeholder="Search pages…" autoFocus />
              <div className="vc-page-list">
                {filteredPages.map(p => (
                  <button key={p.id} className={`vc-page-item${selectedPage === p.id ? ' vc-page-item--selected' : ''}`} onClick={() => setSelectedPage(p.id)}>
                    📄 {p.title}
                  </button>
                ))}
                {filteredPages.length === 0 && <div className="vc-empty-state">No pages found</div>}
              </div>
            </>
          )}
        </div>
        <div className="vc-modal-footer">
          <button className="vc-btn vc-btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
          {step === 'options'
            ? <button className="vc-btn vc-btn-primary" onClick={() => { generatePreview(); setStep('page-select'); }}>Choose Page →</button>
            : <button className="vc-btn vc-btn-primary" onClick={handleAddToPage} disabled={!selectedPage || loading}>{loading ? 'Adding…' : 'Add to Page'}</button>
          }
        </div>
      </div>
    </div>
  );
};
