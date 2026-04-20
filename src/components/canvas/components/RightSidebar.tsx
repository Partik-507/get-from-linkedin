import React, { useCallback } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import {
  selectedIdsAtom, elementsAtom, sidebarOpenAtom,
  currentStrokeColorAtom, currentFillColorAtom, currentStrokeWidthAtom,
  currentStrokeStyleAtom, currentFillStyleAtom, currentRoughnessAtom,
  currentRoundnessAtom, currentOpacityAtom, currentFontSizeAtom,
  currentFontFamilyAtom, currentTextColorAtom, stickyColorAtom,
  gridEnabledAtom, gridStepAtom, snapToGridAtom, snapToObjectsAtom,
  backgroundColorAtom, handDrawnModeAtom, exportModalOpenAtom, addToPageModalOpenAtom,
  variablesPanelOpenAtom,
} from '../state/canvasStore';
import type { AnyElement, TextElement, StickyNoteElement, ArrowElement, FrameElement } from '../elements/types';
import { historyManager } from '../engine/history';
import { rtree } from '../engine/rtree';

const ColorSwatch: React.FC<{ color: string; selected?: boolean; onClick: () => void }> = ({ color, selected, onClick }) => (
  <button
    className={`vc-swatch${selected ? ' vc-swatch--selected' : ''}`}
    style={{ backgroundColor: color === 'transparent' ? 'white' : color, background: color === 'transparent' ? 'repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 0 0 / 8px 8px' : color }}
    onClick={onClick}
    title={color}
  />
);

const PRESET_COLORS = ['#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899', '#1a1a2e'];
const STICKY_COLORS = ['#fef08a', '#fbcfe8', '#bfdbfe', '#bbf7d0', '#e9d5ff', '#fed7aa', '#f1f5f9', '#334155'];

export const RightSidebar: React.FC = () => {
  const [open, setOpen] = useAtom(sidebarOpenAtom);
  const [elements, setElements] = useAtom(elementsAtom);
  const selectedIds = useAtomValue(selectedIdsAtom);
  const [strokeColor, setStrokeColor] = useAtom(currentStrokeColorAtom);
  const [fillColor, setFillColor] = useAtom(currentFillColorAtom);
  const [strokeWidth, setStrokeWidth] = useAtom(currentStrokeWidthAtom);
  const [strokeStyle, setStrokeStyle] = useAtom(currentStrokeStyleAtom);
  const [fillStyle, setFillStyle] = useAtom(currentFillStyleAtom);
  const [roughness, setRoughness] = useAtom(currentRoughnessAtom);
  const [roundness, setRoundness] = useAtom(currentRoundnessAtom);
  const [opacity, setOpacity] = useAtom(currentOpacityAtom);
  const [fontSize, setFontSize] = useAtom(currentFontSizeAtom);
  const [fontFamily, setFontFamily] = useAtom(currentFontFamilyAtom);
  const [textColor, setTextColor] = useAtom(currentTextColorAtom);
  const [bgColor, setBgColor] = useAtom(backgroundColorAtom);
  const [gridEnabled, setGridEnabled] = useAtom(gridEnabledAtom);
  const [gridStep, setGridStep] = useAtom(gridStepAtom);
  const [snapGrid, setSnapGrid] = useAtom(snapToGridAtom);
  const [snapObj, setSnapObj] = useAtom(snapToObjectsAtom);
  const [handDrawn, setHandDrawn] = useAtom(handDrawnModeAtom);
  const [, setExportOpen] = useAtom(exportModalOpenAtom);
  const [, setAddToPageOpen] = useAtom(addToPageModalOpenAtom);
  const [, setVarsOpen] = useAtom(variablesPanelOpenAtom);
  const [stickyColor, setStickyColor] = useAtom(stickyColorAtom);

  const selected = elements.filter(el => selectedIds.has(el.id));
  const firstSel = selected[0];

  const updateSelected = useCallback((updater: (el: AnyElement) => AnyElement) => {
    const newEls = elements.map(el => selectedIds.has(el.id) ? { ...updater(el), version: el.version + 1, updatedAt: Date.now() } : el);
    setElements(newEls);
    historyManager.push(newEls, 'Style change');
    rtree.rebuild(newEls);
  }, [elements, selectedIds, setElements]);

  const deleteSelected = useCallback(() => {
    const newEls = elements.filter(el => !selectedIds.has(el.id));
    setElements(newEls);
    historyManager.push(newEls, 'Delete');
    rtree.rebuild(newEls);
  }, [elements, selectedIds, setElements]);

  const bringForward = () => {
    const newEls = [...elements].sort((a, b) => a.zIndex - b.zIndex);
    selectedIds.forEach(id => {
      const idx = newEls.findIndex(e => e.id === id);
      if (idx < newEls.length - 1) {
        [newEls[idx], newEls[idx + 1]] = [newEls[idx + 1], newEls[idx]];
      }
    });
    newEls.forEach((e, i) => { e.zIndex = i; });
    setElements(newEls);
  };

  const sendBackward = () => {
    const newEls = [...elements].sort((a, b) => a.zIndex - b.zIndex);
    const selArr = Array.from(selectedIds);
    selArr.forEach(id => {
      const idx = newEls.findIndex(e => e.id === id);
      if (idx > 0) {
        [newEls[idx], newEls[idx - 1]] = [newEls[idx - 1], newEls[idx]];
      }
    });
    newEls.forEach((e, i) => { e.zIndex = i; });
    setElements(newEls);
  };

  if (!open) {
    return (
      <button className="vc-sidebar-collapsed" onClick={() => setOpen(true)} title="Open properties">›</button>
    );
  }

  const isNoneSelected = selected.length === 0;
  const isText = firstSel?.type === 'text';
  const isSticky = firstSel?.type === 'sticky-note';
  const isArrow = firstSel?.type === 'arrow' || firstSel?.type === 'line';
  const isFrame = firstSel?.type === 'frame';
  const isMulti = selected.length > 1;

  return (
    <div className="vc-sidebar">
      <div className="vc-sidebar-header">
        <span className="vc-sidebar-title">{isNoneSelected ? 'Canvas' : isMulti ? 'Selection' : firstSel?.type}</span>
        <button className="vc-sidebar-collapse" onClick={() => setOpen(false)} title="Collapse">‹</button>
      </div>

      {isNoneSelected && (
        <>
          <Section title="Canvas">
            <Row label="Background">
              <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="vc-color-input" />
            </Row>
            <Row label="Grid">
              <Toggle checked={gridEnabled} onChange={setGridEnabled} />
            </Row>
            {gridEnabled && (
              <Row label="Grid step">
                <input type="range" min={5} max={100} step={5} value={gridStep} onChange={e => setGridStep(+e.target.value)} className="vc-slider" />
                <span className="vc-value">{gridStep}</span>
              </Row>
            )}
            <Row label="Snap to grid"><Toggle checked={snapGrid} onChange={setSnapGrid} /></Row>
            <Row label="Snap to objects"><Toggle checked={snapObj} onChange={setSnapObj} /></Row>
            <Row label="Hand-drawn mode"><Toggle checked={handDrawn} onChange={setHandDrawn} /></Row>
          </Section>
          <Section title="Export Canvas">
            <button className="vc-btn vc-btn-secondary" onClick={() => setExportOpen(true)}>Export…</button>
            <button className="vc-btn vc-btn-secondary" onClick={() => setAddToPageOpen(true)}>Add to Page…</button>
          </Section>
          <div className="vc-sidebar-footer">
            <button className="vc-btn-ghost" onClick={() => setVarsOpen(true)}>Canvas Variables</button>
          </div>
        </>
      )}

      {!isNoneSelected && (
        <>
          {isSticky ? (
            <Section title="Color">
              <div className="vc-sticky-colors">
                {STICKY_COLORS.map(c => (
                  <button key={c} className={`vc-sticky-swatch${(firstSel as StickyNoteElement)?.stickyColor === c ? ' vc-sticky-swatch--sel' : ''}`}
                    style={{ backgroundColor: c }}
                    onClick={() => { updateSelected(el => ({ ...el, stickyColor: c } as any)); setStickyColor(c); }} />
                ))}
              </div>
            </Section>
          ) : !isArrow && !isFrame && (
            <>
              <Section title="Stroke">
                <div className="vc-swatches">
                  {PRESET_COLORS.map(c => (
                    <ColorSwatch key={c} color={c} selected={strokeColor === c} onClick={() => { setStrokeColor(c); updateSelected(el => ({ ...el, strokeColor: c })); }} />
                  ))}
                  <input type="color" value={strokeColor} onChange={e => { setStrokeColor(e.target.value); updateSelected(el => ({ ...el, strokeColor: e.target.value })); }} className="vc-color-input" title="Custom color" />
                </div>
              </Section>
              <Section title="Fill">
                <div className="vc-swatches">
                  <ColorSwatch color="transparent" selected={fillColor === 'transparent'} onClick={() => { setFillColor('transparent'); updateSelected(el => ({ ...el, fillColor: 'transparent', fillStyle: 'none' })); }} />
                  {PRESET_COLORS.slice(1).map(c => (
                    <ColorSwatch key={c} color={c} selected={fillColor === c} onClick={() => { setFillColor(c); updateSelected(el => ({ ...el, fillColor: c, fillStyle: 'solid' })); }} />
                  ))}
                  <input type="color" value={fillColor === 'transparent' ? '#ffffff' : fillColor} onChange={e => { setFillColor(e.target.value); updateSelected(el => ({ ...el, fillColor: e.target.value, fillStyle: 'solid' })); }} className="vc-color-input" />
                </div>
                <div className="vc-fill-styles">
                  {(['none', 'solid', 'hachure', 'cross-hatch', 'dots', 'zigzag'] as const).map(s => (
                    <button key={s} className={`vc-chip${fillStyle === s ? ' vc-chip--active' : ''}`} onClick={() => { setFillStyle(s); updateSelected(el => ({ ...el, fillStyle: s })); }}>{s}</button>
                  ))}
                </div>
              </Section>
            </>
          )}

          <Section title="Stroke Width">
            <div className="vc-btn-row">
              {([1, 2, 4] as const).map(w => (
                <button key={w} className={`vc-chip${strokeWidth === w ? ' vc-chip--active' : ''}`} onClick={() => { setStrokeWidth(w); updateSelected(el => ({ ...el, strokeWidth: w })); }}>{w === 1 ? 'Thin' : w === 2 ? 'Medium' : 'Thick'}</button>
              ))}
            </div>
          </Section>

          <Section title="Stroke Style">
            <div className="vc-btn-row">
              {(['solid', 'dashed', 'dotted'] as const).map(s => (
                <button key={s} className={`vc-chip${strokeStyle === s ? ' vc-chip--active' : ''}`} onClick={() => { setStrokeStyle(s); updateSelected(el => ({ ...el, strokeStyle: s })); }}>{s}</button>
              ))}
            </div>
          </Section>

          {!isText && !isSticky && !isArrow && (
            <>
              <Section title="Roughness">
                <div className="vc-btn-row">
                  {([0, 1, 2, 3] as const).map(r => (
                    <button key={r} className={`vc-chip${roughness === r ? ' vc-chip--active' : ''}`} onClick={() => { setRoughness(r); updateSelected(el => ({ ...el, roughness: r })); }}>{['Arch', 'Artist', 'Cartoon', 'Chaos'][r]}</button>
                  ))}
                </div>
              </Section>
              <Section title="Corners">
                <div className="vc-btn-row">
                  {(['none', 'sharp', 'round', 'extra-round'] as const).map(r => (
                    <button key={r} className={`vc-chip${roundness === r ? ' vc-chip--active' : ''}`} onClick={() => { setRoundness(r); updateSelected(el => ({ ...el, roundness: r })); }}>{r}</button>
                  ))}
                </div>
              </Section>
            </>
          )}

          <Section title="Opacity">
            <Row label="">
              <input type="range" min={0} max={100} value={opacity} onChange={e => { setOpacity(+e.target.value); updateSelected(el => ({ ...el, opacity: +e.target.value })); }} className="vc-slider" />
              <span className="vc-value">{opacity}%</span>
            </Row>
          </Section>

          {(isText || isSticky) && (
            <Section title="Text">
              <Row label="Font">
                <select className="vc-select" value={fontFamily} onChange={e => { setFontFamily(e.target.value); updateSelected(el => ({ ...el, fontFamily: e.target.value } as any)); }}>
                  {['system-ui', 'serif', 'monospace', 'cursive', 'Inter', 'Lora', 'Fira Code'].map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </Row>
              <Row label="Size">
                <input type="number" min={8} max={300} value={fontSize} onChange={e => { setFontSize(+e.target.value); updateSelected(el => ({ ...el, fontSize: +e.target.value } as any)); }} className="vc-number-input" />
              </Row>
              <Row label="Color">
                <input type="color" value={textColor} onChange={e => { setTextColor(e.target.value); updateSelected(el => ({ ...el, textColor: e.target.value } as any)); }} className="vc-color-input" />
              </Row>
            </Section>
          )}

          <Section title="Position & Size" collapsible defaultOpen={false}>
            {firstSel && (
              <>
                <Row label="X"><input type="number" value={Math.round(firstSel.x)} onChange={e => updateSelected(el => ({ ...el, x: +e.target.value }))} className="vc-number-input" /></Row>
                <Row label="Y"><input type="number" value={Math.round(firstSel.y)} onChange={e => updateSelected(el => ({ ...el, y: +e.target.value }))} className="vc-number-input" /></Row>
                <Row label="W"><input type="number" value={Math.round(firstSel.width)} onChange={e => updateSelected(el => ({ ...el, width: +e.target.value }))} className="vc-number-input" /></Row>
                <Row label="H"><input type="number" value={Math.round(firstSel.height)} onChange={e => updateSelected(el => ({ ...el, height: +e.target.value }))} className="vc-number-input" /></Row>
                <Row label="°"><input type="number" value={Math.round(firstSel.angle * 180 / Math.PI)} onChange={e => updateSelected(el => ({ ...el, angle: +e.target.value * Math.PI / 180 }))} className="vc-number-input" /></Row>
              </>
            )}
          </Section>

          <Section title="Layer">
            <div className="vc-btn-row">
              <button className="vc-chip" onClick={sendBackward}>↓ Back</button>
              <button className="vc-chip" onClick={bringForward}>↑ Front</button>
            </div>
          </Section>

          {isMulti && (
            <Section title="Align">
              <div className="vc-align-grid">
                {[
                  { label: '⊢', title: 'Align Left', fn: () => { const minX = Math.min(...selected.map(e => e.x)); updateSelected(el => ({ ...el, x: minX })); } },
                  { label: '⊥', title: 'Align Center H', fn: () => { const avgX = selected.reduce((s, e) => s + e.x + e.width / 2, 0) / selected.length; updateSelected(el => ({ ...el, x: avgX - el.width / 2 })); } },
                  { label: '⊣', title: 'Align Right', fn: () => { const maxX = Math.max(...selected.map(e => e.x + e.width)); updateSelected(el => ({ ...el, x: maxX - el.width })); } },
                  { label: '⊤', title: 'Align Top', fn: () => { const minY = Math.min(...selected.map(e => e.y)); updateSelected(el => ({ ...el, y: minY })); } },
                  { label: '⊞', title: 'Align Center V', fn: () => { const avgY = selected.reduce((s, e) => s + e.y + e.height / 2, 0) / selected.length; updateSelected(el => ({ ...el, y: avgY - el.height / 2 })); } },
                  { label: '⊡', title: 'Align Bottom', fn: () => { const maxY = Math.max(...selected.map(e => e.y + e.height)); updateSelected(el => ({ ...el, y: maxY - el.height })); } },
                ].map(a => <button key={a.title} className="vc-chip" onClick={a.fn} title={a.title}>{a.label}</button>)}
              </div>
            </Section>
          )}

          <Section title="Actions">
            <div className="vc-btn-row">
              <button className="vc-chip" onClick={() => updateSelected(el => ({ ...el, locked: !el.locked }))}>🔒 {firstSel?.locked ? 'Unlock' : 'Lock'}</button>
              <button className="vc-chip" onClick={() => updateSelected(el => ({ ...el, hidden: !el.hidden }))}>👁 {firstSel?.hidden ? 'Show' : 'Hide'}</button>
            </div>
            <button className="vc-btn vc-btn-danger" onClick={deleteSelected}>🗑 Delete</button>
          </Section>
        </>
      )}
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode; collapsible?: boolean; defaultOpen?: boolean }> = ({ title, children, collapsible, defaultOpen = true }) => {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="vc-sidebar-section">
      <div className="vc-sidebar-section-header" onClick={() => collapsible && setOpen(o => !o)} style={{ cursor: collapsible ? 'pointer' : 'default' }}>
        <span className="vc-sidebar-section-title">{title}</span>
        {collapsible && <span>{open ? '▾' : '▸'}</span>}
      </div>
      {open && <div className="vc-sidebar-section-body">{children}</div>}
    </div>
  );
};

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="vc-row">
    {label && <span className="vc-row-label">{label}</span>}
    <div className="vc-row-control">{children}</div>
  </div>
);

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <button className={`vc-toggle${checked ? ' vc-toggle--on' : ''}`} onClick={() => onChange(!checked)} aria-pressed={checked}>
    <span className="vc-toggle-thumb" />
  </button>
);
