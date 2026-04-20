import React, { useEffect, useRef } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { contextMenuAtom, elementsAtom, selectedIdsAtom, gridEnabledAtom, snapToGridAtom } from '../state/canvasStore';
import { historyManager } from '../engine/history';
import { rtree } from '../engine/rtree';
import type { AnyElement } from '../elements/types';

export const ContextMenu: React.FC = () => {
  const [contextMenu, setContextMenu] = useAtom(contextMenuAtom);
  const [elements, setElements] = useAtom(elementsAtom);
  const [selectedIds, setSelectedIds] = useAtom(selectedIdsAtom);
  const [gridEnabled, setGridEnabled] = useAtom(gridEnabledAtom);
  const [snapGrid, setSnapGrid] = useAtom(snapToGridAtom);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [setContextMenu]);

  if (!contextMenu) return null;

  const { x, y, elementId } = contextMenu;
  const el = elementId ? elements.find(e => e.id === elementId) : null;

  const commit = (newEls: AnyElement[], desc: string) => {
    setElements(newEls);
    historyManager.push(newEls, desc);
    rtree.rebuild(newEls);
    setContextMenu(null);
  };

  const copyElement = () => {
    const toCopy = elements.filter(e => selectedIds.has(e.id));
    if (toCopy.length) navigator.clipboard.writeText(JSON.stringify(toCopy));
    setContextMenu(null);
  };

  const deleteSelected = () => {
    const newEls = elements.filter(e => !selectedIds.has(e.id) && e.id !== elementId);
    commit(newEls, 'Delete');
    setSelectedIds(new Set());
  };

  const duplicate = () => {
    if (!elementId) return;
    const orig = elements.find(e => e.id === elementId);
    if (!orig) return;
    const clone = { ...orig, id: crypto.randomUUID(), x: orig.x + 10, y: orig.y + 10, createdAt: Date.now(), updatedAt: Date.now() };
    commit([...elements, clone], 'Duplicate');
  };

  const lock = () => {
    if (!elementId) return;
    commit(elements.map(e => e.id === elementId ? { ...e, locked: !e.locked } : e), 'Lock');
  };

  const bringToFront = () => {
    if (!elementId) return;
    const max = Math.max(...elements.map(e => e.zIndex));
    commit(elements.map(e => e.id === elementId ? { ...e, zIndex: max + 1 } : e), 'Bring to front');
  };

  const sendToBack = () => {
    if (!elementId) return;
    commit(elements.map(e => e.id === elementId ? { ...e, zIndex: 0 } : e).map((e, i) => ({ ...e, zIndex: e.id === elementId ? 0 : e.zIndex + 1 })), 'Send to back');
  };

  const items = el ? [
    { label: 'Cut', action: () => { copyElement(); deleteSelected(); } },
    { label: 'Copy', action: copyElement },
    { label: 'Duplicate', action: duplicate },
    { label: 'Delete', action: deleteSelected },
    { type: 'separator' },
    { label: el.locked ? 'Unlock' : 'Lock', action: lock },
    { label: el.hidden ? 'Show' : 'Hide', action: () => { commit(elements.map(e => e.id === elementId ? { ...e, hidden: !e.hidden } : e), 'Hide'); } },
    { type: 'separator' },
    { label: 'Bring to Front', action: bringToFront },
    { label: 'Send to Back', action: sendToBack },
    { type: 'separator' },
    { label: 'Copy as PNG', action: () => setContextMenu(null) },
  ] : [
    { label: 'Paste', action: () => { navigator.clipboard.readText().then(text => { try { const parsed = JSON.parse(text); if (Array.isArray(parsed)) { const offset = parsed.map(e => ({ ...e, id: crypto.randomUUID(), x: e.x + 10, y: e.y + 10 })); commit([...elements, ...offset], 'Paste'); } } catch {} }); setContextMenu(null); } },
    { label: 'Select All', action: () => { setSelectedIds(new Set(elements.map(e => e.id))); setContextMenu(null); } },
    { type: 'separator' },
    { label: `${gridEnabled ? 'Hide' : 'Show'} Grid`, action: () => { setGridEnabled(!gridEnabled); setContextMenu(null); } },
    { label: `${snapGrid ? 'Disable' : 'Enable'} Snap`, action: () => { setSnapGrid(!snapGrid); setContextMenu(null); } },
  ];

  return (
    <div
      ref={ref}
      className="vc-context-menu"
      style={{ position: 'absolute', left: x, top: y, zIndex: 9999 }}
    >
      {items.map((item, i) => (
        item.type === 'separator'
          ? <div key={i} className="vc-context-separator" />
          : <button key={i} className="vc-context-item" onClick={item.action}>{item.label}</button>
      ))}
    </div>
  );
};
