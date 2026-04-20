import { useEffect } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import {
  activeToolAtom, selectedIdsAtom, elementsAtom, viewportAtom,
  commandPaletteOpenAtom, exportModalOpenAtom, addToPageModalOpenAtom,
  gridEnabledAtom, showMinimapAtom, showRulersAtom, sidebarOpenAtom,
  focusModeAtom, presentationModeAtom, isSavedAtom,
  canvasSearchOpenAtom,
} from '../state/canvasStore';
import { historyManager } from './history';
import { rtree } from './rtree';
import { zoomAtPoint, fitToElements } from './viewport';
import type { AnyElement } from '../elements/types';
import { newId } from '../utils/geometry';

export function useKeyboardShortcuts() {
  const [activeTool, setTool] = useAtom(activeToolAtom);
  const [selectedIds, setSelectedIds] = useAtom(selectedIdsAtom);
  const [elements, setElements] = useAtom(elementsAtom);
  const [viewport, setViewport] = useAtom(viewportAtom);
  const setCmdPalette = useSetAtom(commandPaletteOpenAtom);
  const setExport = useSetAtom(exportModalOpenAtom);
  const setAddToPage = useSetAtom(addToPageModalOpenAtom);
  const [gridEnabled, setGrid] = useAtom(gridEnabledAtom);
  const [showMinimap, setMinimap] = useAtom(showMinimapAtom);
  const [showRulers, setRulers] = useAtom(showRulersAtom);
  const [sidebarOpen, setSidebar] = useAtom(sidebarOpenAtom);
  const [focusMode, setFocusMode] = useAtom(focusModeAtom);
  const setPresentation = useSetAtom(presentationModeAtom);
  const setIsSaved = useSetAtom(isSavedAtom);
  const setSearch = useSetAtom(canvasSearchOpenAtom);

  const commitElements = (newEls: AnyElement[], desc: string) => {
    setElements(newEls);
    historyManager.push(newEls, desc);
    rtree.rebuild(newEls);
    setIsSaved(false);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isEditing = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true';
      const cmd = e.ctrlKey || e.metaKey;

      // Command palette
      if (cmd && (e.key === '/' || e.key === 'p')) { e.preventDefault(); setCmdPalette(true); return; }

      // Export
      if (cmd && e.key === 'e' && !e.shiftKey) { e.preventDefault(); setExport(true); return; }

      // Add to Page
      if (cmd && e.shiftKey && e.key === 'P') { e.preventDefault(); setAddToPage(true); return; }

      // Undo/Redo
      if (cmd && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        const prev = historyManager.undo(elements);
        if (prev) { setElements(prev); rtree.rebuild(prev); }
        return;
      }
      if (cmd && (e.key === 'y' || (e.shiftKey && e.key === 'z') || (e.key === 'Z'))) {
        e.preventDefault();
        const next = historyManager.redo();
        if (next) { setElements(next); rtree.rebuild(next); }
        return;
      }

      // Select All
      if (cmd && e.key === 'a') { e.preventDefault(); setSelectedIds(new Set(elements.map(el => el.id))); return; }

      // Delete
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isEditing) {
        if (selectedIds.size > 0) { commitElements(elements.filter(el => !selectedIds.has(el.id)), 'Delete'); setSelectedIds(new Set()); }
        return;
      }

      // Copy/Cut/Paste
      if (cmd && e.key === 'c' && !isEditing) {
        const toCopy = elements.filter(el => selectedIds.has(el.id));
        if (toCopy.length) navigator.clipboard.writeText(JSON.stringify(toCopy));
        return;
      }
      if (cmd && e.key === 'x' && !isEditing) {
        const toCopy = elements.filter(el => selectedIds.has(el.id));
        if (toCopy.length) {
          navigator.clipboard.writeText(JSON.stringify(toCopy));
          commitElements(elements.filter(el => !selectedIds.has(el.id)), 'Cut');
          setSelectedIds(new Set());
        }
        return;
      }
      if (cmd && e.key === 'v' && !isEditing) {
        navigator.clipboard.readText().then(text => {
          try {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) {
              const offset = parsed.map(el => ({ ...el, id: newId(), x: el.x + 10, y: el.y + 10, createdAt: Date.now() }));
              commitElements([...elements, ...offset], 'Paste');
            }
          } catch {}
        });
        return;
      }

      // Duplicate
      if (cmd && e.key === 'd' && !isEditing) {
        e.preventDefault();
        const duped = elements.filter(el => selectedIds.has(el.id)).map(el => ({ ...el, id: newId(), x: el.x + 10, y: el.y + 10 }));
        commitElements([...elements, ...duped], 'Duplicate');
        setSelectedIds(new Set(duped.map(el => el.id)));
        return;
      }

      // Group
      if (cmd && e.key === 'g' && !e.shiftKey) {
        e.preventDefault();
        const groupId = newId();
        const newEls = elements.map(el => selectedIds.has(el.id) ? { ...el, groupId } : el);
        commitElements(newEls, 'Group');
        return;
      }
      if (cmd && e.shiftKey && e.key === 'G') {
        e.preventDefault();
        const newEls = elements.map(el => selectedIds.has(el.id) ? { ...el, groupId: null } : el);
        commitElements(newEls, 'Ungroup');
        return;
      }

      // Layer order
      if (cmd && e.key === ']') { e.preventDefault(); const newEls = [...elements].map(el => selectedIds.has(el.id) ? { ...el, zIndex: el.zIndex + 1 } : el); commitElements(newEls, 'Bring forward'); return; }
      if (cmd && e.key === '[') { e.preventDefault(); const newEls = [...elements].map(el => selectedIds.has(el.id) ? { ...el, zIndex: Math.max(0, el.zIndex - 1) } : el); commitElements(newEls, 'Send backward'); return; }

      // Zoom
      if (cmd && (e.key === '=' || e.key === '+')) { e.preventDefault(); setViewport(vp => zoomAtPoint(vp, vp.zoom * 1.2, { x: vp.width / 2, y: vp.height / 2 })); return; }
      if (cmd && e.key === '-') { e.preventDefault(); setViewport(vp => zoomAtPoint(vp, vp.zoom * 0.8, { x: vp.width / 2, y: vp.height / 2 })); return; }
      if (cmd && e.key === '0') { e.preventDefault(); setViewport(vp => ({ ...vp, zoom: 1, x: 0, y: 0 })); return; }

      if (e.shiftKey && e.key === '1') { setViewport(vp => fitToElements(elements, vp.width, vp.height)); return; }
      if (e.shiftKey && e.key === '2') {
        const sel = elements.filter(el => selectedIds.has(el.id));
        if (sel.length) setViewport(vp => fitToElements(sel, vp.width, vp.height));
        return;
      }
      if (e.shiftKey && e.key === '3') { setViewport(vp => ({ ...vp, zoom: 1 })); return; }

      // Nudge with arrows
      if (!isEditing && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) && selectedIds.size > 0) {
        e.preventDefault();
        const d = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0;
        const dy = e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0;
        const newEls = elements.map(el => selectedIds.has(el.id) ? { ...el, x: el.x + dx, y: el.y + dy } : el);
        setElements(newEls); rtree.rebuild(newEls);
        return;
      }

      // Pan with arrows (no selection)
      if (!isEditing && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) && selectedIds.size === 0) {
        e.preventDefault();
        const d = e.shiftKey ? 100 : 10;
        const dx = e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0;
        const dy = e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0;
        setViewport(vp => ({ ...vp, x: vp.x + dx / vp.zoom, y: vp.y + dy / vp.zoom }));
        return;
      }

      // Escape
      if (e.key === 'Escape') { setSelectedIds(new Set()); setTool('select'); return; }

      if (isEditing) return;

      // Toggle UI
      if (cmd && e.key === "'") { e.preventDefault(); setGrid(g => !g); return; }
      if (cmd && e.shiftKey && e.key === 'M') { e.preventDefault(); setMinimap(m => !m); return; }
      if (cmd && e.shiftKey && e.key === 'R') { e.preventDefault(); setRulers(r => !r); return; }
      if (cmd && e.key === '\\') { e.preventDefault(); setSidebar(s => !s); return; }
      if (cmd && e.shiftKey && e.key === 'F') { e.preventDefault(); setFocusMode(f => !f); return; }
      if (cmd && e.shiftKey && e.key === 'K') { e.preventDefault(); /* Copy as PNG */ return; }
      if (cmd && e.shiftKey && e.key === 'F') { e.preventDefault(); setSearch(true); return; }

      // Presentation
      if (!cmd && e.altKey && e.key === 'p') { setPresentation(true); return; }

      // Tool shortcuts
      const toolMap: Record<string, string> = {
        'v': 'select', '1': 'select', 'h': 'hand',
        'r': 'rectangle', '2': 'rectangle',
        'd': 'diamond', '3': 'diamond',
        'o': 'ellipse', '4': 'ellipse',
        'a': 'arrow', '5': 'arrow',
        'l': 'line', '6': 'line',
        'p': 'freedraw', '7': 'freedraw',
        't': 'text', '8': 'text',
        'f': 'frame',
        's': 'sticky-note',
        'b': 'table',
        'i': 'image', '9': 'image',
        'w': 'embed',
        'm': 'latex',
        'g': 'mermaid',
        'e': 'eraser',
        '0': 'library',
      };
      if (toolMap[e.key.toLowerCase()]) { setTool(toolMap[e.key.toLowerCase()] as any); return; }

      // Flip
      if (e.shiftKey && e.key === 'H') { /* flip horizontal */ return; }
      if (e.shiftKey && e.key === 'V') { /* flip vertical */ return; }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [elements, selectedIds, viewport, activeTool]);
}
