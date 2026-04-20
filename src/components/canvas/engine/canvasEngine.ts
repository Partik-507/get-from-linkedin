import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useRef, useCallback, useEffect } from 'react';
import type { AnyElement, Tool, Point, ArrowElement, FreedrawElement, TextElement, StickyNoteElement, TableElement, FrameElement, ZoneElement } from '../elements/types';
import {
  activeToolAtom, elementsAtom, selectedIdsAtom, viewportAtom, isDrawingAtom,
  drawingPreviewAtom, editingTextIdAtom, currentStrokeColorAtom, currentFillColorAtom,
  currentStrokeWidthAtom, currentStrokeStyleAtom, currentFillStyleAtom, currentRoughnessAtom,
  currentRoundnessAtom, currentOpacityAtom, currentFontSizeAtom, currentFontFamilyAtom,
  currentTextColorAtom, stickyColorAtom, isSavedAtom, gridEnabledAtom, gridStepAtom,
  snapToGridAtom, snapToObjectsAtom, hoveredIdAtom, contextMenuAtom, handDrawnModeAtom,
  tableDialogOpenAtom, tableDialogPositionAtom, mermaidEditorOpenAtom, latexEditorOpenAtom,
} from '../state/canvasStore';
import { screenToWorld, zoomAtPoint } from './viewport';
import { snapToGrid, isPointInElement, newId, randomSeed, getBoundingBox, nearestConnectionPoint } from '../utils/geometry';
import { historyManager } from './history';
import { rtree } from './rtree';

export function useCanvasInteraction(canvasRef: React.RefObject<HTMLCanvasElement>) {
  const [elements, setElements] = useAtom(elementsAtom);
  const [viewport, setViewport] = useAtom(viewportAtom);
  const [activeTool] = useAtom(activeToolAtom);
  const [selectedIds, setSelectedIds] = useAtom(selectedIdsAtom);
  const [, setIsDrawing] = useAtom(isDrawingAtom);
  const [, setDrawingPreview] = useAtom(drawingPreviewAtom);
  const [, setEditingTextId] = useAtom(editingTextIdAtom);
  const [, setHoveredId] = useAtom(hoveredIdAtom);
  const [, setIsSaved] = useAtom(isSavedAtom);
  const [, setContextMenu] = useAtom(contextMenuAtom);

  const strokeColor = useAtomValue(currentStrokeColorAtom);
  const fillColor = useAtomValue(currentFillColorAtom);
  const strokeWidth = useAtomValue(currentStrokeWidthAtom);
  const strokeStyle = useAtomValue(currentStrokeStyleAtom);
  const fillStyle = useAtomValue(currentFillStyleAtom);
  const roughness = useAtomValue(currentRoughnessAtom);
  const roundness = useAtomValue(currentRoundnessAtom);
  const opacity = useAtomValue(currentOpacityAtom);
  const fontSize = useAtomValue(currentFontSizeAtom);
  const fontFamily = useAtomValue(currentFontFamilyAtom);
  const textColor = useAtomValue(currentTextColorAtom);
  const stickyColor = useAtomValue(stickyColorAtom);
  const gridEnabled = useAtomValue(gridEnabledAtom);
  const gridStep = useAtomValue(gridStepAtom);
  const snapGrid = useAtomValue(snapToGridAtom);
  const handDrawnMode = useAtomValue(handDrawnModeAtom);
  const setTableDialogOpen = useSetAtom(tableDialogOpenAtom);
  const setTableDialogPos = useSetAtom(tableDialogPositionAtom);
  const setMermaidOpen = useSetAtom(mermaidEditorOpenAtom);
  const setLatexOpen = useSetAtom(latexEditorOpenAtom);

  const stateRef = useRef({
    isPanning: false, isDrawing: false, isDragging: false, isSelecting: false,
    isResizing: false, isRotating: false,
    startWorld: { x: 0, y: 0 }, startScreen: { x: 0, y: 0 },
    panStart: { vx: 0, vy: 0, sx: 0, sy: 0 },
    selectionRect: null as { x: number; y: number; width: number; height: number } | null,
    dragIds: [] as string[], dragStartPositions: new Map<string, { x: number; y: number }>(),
    resizeHandle: -1, resizeElement: null as AnyElement | null,
    rotateElement: null as AnyElement | null,
    drawingId: '',
    currentPoints: [] as Point[], pressures: [] as number[],
    activeTool,
    elements,
    viewport,
    selectedIds,
  });

  // Keep refs in sync
  useEffect(() => { stateRef.current.activeTool = activeTool; }, [activeTool]);
  useEffect(() => { stateRef.current.elements = elements; }, [elements]);
  useEffect(() => { stateRef.current.viewport = viewport; }, [viewport]);
  useEffect(() => { stateRef.current.selectedIds = selectedIds; }, [selectedIds]);

  const markDirty = useCallback(() => setIsSaved(false), [setIsSaved]);

  const getWorldPos = useCallback((e: MouseEvent | TouchEvent | PointerEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0]?.clientX ?? 0;
      clientY = e.touches[0]?.clientY ?? 0;
    } else {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }
    const vp = stateRef.current.viewport;
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    const world = screenToWorld(sx, sy, vp);
    if (snapGrid && gridEnabled) {
      return { x: snapToGrid(world.x, gridStep), y: snapToGrid(world.y, gridStep) };
    }
    return world;
  }, [canvasRef, snapGrid, gridEnabled, gridStep]);

  const commitElements = useCallback((newElements: AnyElement[], description: string) => {
    setElements(newElements);
    historyManager.push(newElements, description);
    rtree.rebuild(newElements);
    markDirty();
  }, [setElements, markDirty]);

  const createBaseElement = useCallback((type: AnyElement['type'], x: number, y: number, w = 120, h = 80): AnyElement => {
    return {
      id: newId(), type, x, y, width: w, height: h, angle: 0,
      opacity, locked: false, hidden: false, groupId: null, frameId: null,
      zIndex: stateRef.current.elements.length,
      link: null, customData: {}, version: 1,
      updatedAt: Date.now(), createdAt: Date.now(),
      strokeColor, fillColor, fillStyle, strokeWidth, strokeStyle,
      roughness: handDrawnMode ? 2 : roughness, roundness, seed: randomSeed(),
    };
  }, [strokeColor, fillColor, fillStyle, strokeWidth, strokeStyle, roughness, roundness, opacity, handDrawnMode]);

  const onPointerDown = useCallback((e: PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = stateRef.current;
    const tool = s.activeTool;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const world = getWorldPos(e);

    if (e.button === 1 || tool === 'hand' || (e.button === 0 && tool === 'hand')) {
      s.isPanning = true;
      s.panStart = { vx: s.viewport.x, vy: s.viewport.y, sx: e.clientX, sy: e.clientY };
      canvas.style.cursor = 'grabbing';
      return;
    }

    if (e.button === 2) return; // context menu handled separately

    if (tool === 'select') {
      // Hit test
      const vp = s.viewport;
      const bounds = { minX: vp.x, minY: vp.y, maxX: vp.x + vp.width / vp.zoom, maxY: vp.y + vp.height / vp.zoom };
      const visibleIds = rtree.query(bounds.minX, bounds.minY, bounds.maxX, bounds.maxY);
      const hit = visibleIds
        .map(id => s.elements.find(el => el.id === id))
        .filter(Boolean)
        .filter(el => isPointInElement(world.x, world.y, el!))
        .sort((a, b) => b!.zIndex - a!.zIndex)[0] as AnyElement | undefined;

      if (hit) {
        if (!e.shiftKey && !s.selectedIds.has(hit.id)) setSelectedIds(new Set([hit.id]));
        else if (e.shiftKey) {
          const newSel = new Set(s.selectedIds);
          if (newSel.has(hit.id)) newSel.delete(hit.id); else newSel.add(hit.id);
          setSelectedIds(newSel);
        }
        s.isDragging = true;
        s.dragIds = e.shiftKey ? Array.from(s.selectedIds) : [hit.id];
        s.dragStartPositions.clear();
        for (const id of s.dragIds) {
          const el = s.elements.find(el => el.id === id);
          if (el) s.dragStartPositions.set(id, { x: el.x, y: el.y });
        }
        s.startWorld = world;
        if (!s.selectedIds.has(hit.id)) setSelectedIds(new Set([hit.id]));
      } else {
        if (!e.shiftKey) setSelectedIds(new Set());
        s.isSelecting = true;
        s.startWorld = world;
        s.selectionRect = { x: world.x, y: world.y, width: 0, height: 0 };
      }
      return;
    }

    if (tool === 'eraser') {
      const vp = s.viewport;
      const visibleIds = rtree.query(vp.x, vp.y, vp.x + vp.width / vp.zoom, vp.y + vp.height / vp.zoom);
      const toDelete = visibleIds.filter(id => {
        const el = s.elements.find(e => e.id === id);
        return el && isPointInElement(world.x, world.y, el);
      });
      if (toDelete.length > 0) {
        const newEls = s.elements.filter(el => !toDelete.includes(el.id));
        commitElements(newEls, 'Erase');
      }
      return;
    }

    if (tool === 'text') {
      const el: TextElement = {
        ...createBaseElement('text', world.x, world.y, 200, 40) as any,
        content: '', fontSize, fontFamily, fontWeight: 'normal', fontStyle: '',
        textDecoration: '', textAlign: 'left', lineHeight: 1.4, letterSpacing: 0,
        textColor, textBackground: 'transparent', markdownMode: false,
      };
      const newEls = [...s.elements, el];
      commitElements(newEls, 'Add text');
      setEditingTextId(el.id);
      return;
    }

    if (tool === 'sticky-note') {
      const el: StickyNoteElement = {
        ...createBaseElement('sticky-note', world.x, world.y, 180, 150) as any,
        content: '', stickyColor, pinned: false, fontSize: 14, fontFamily: 'system-ui', textAlign: 'left',
      };
      const newEls = [...s.elements, el];
      commitElements(newEls, 'Add sticky note');
      setEditingTextId(el.id);
      return;
    }

    if (tool === 'table') {
      setTableDialogPos(world);
      setTableDialogOpen(true);
      return;
    }

    if (tool === 'mermaid') { setMermaidOpen(true); return; }
    if (tool === 'latex') { setLatexOpen(true); return; }

    if (tool === 'arrow' || tool === 'line') {
      const el: ArrowElement = {
        ...createBaseElement(tool, world.x, world.y, 0, 0) as any,
        points: [world, { x: world.x + 1, y: world.y + 1 }],
        arrowType: 'normal', startCap: 'none', endCap: tool === 'arrow' ? 'arrow' : 'none',
        startBindingId: null, endBindingId: null, label: '', waypoints: [],
      };
      s.drawingId = el.id;
      s.isDrawing = true;
      s.currentPoints = [world];
      setIsDrawing(true);
      setDrawingPreview(el);
      return;
    }

    if (tool === 'freedraw') {
      const el: FreedrawElement = {
        ...createBaseElement('freedraw', world.x, world.y, 0, 0) as any,
        points: [world], pressures: [e.pressure || 0.5], smoothing: 0.5,
      };
      s.drawingId = el.id;
      s.isDrawing = true;
      s.currentPoints = [world];
      s.pressures = [e.pressure || 0.5];
      setIsDrawing(true);
      setDrawingPreview(el);
      return;
    }

    if (isShapeTool(tool)) {
      s.isDrawing = true;
      s.startWorld = world;
      const el = createBaseElement(tool as AnyElement['type'], world.x, world.y, 1, 1);
      s.drawingId = el.id;
      setIsDrawing(true);
      setDrawingPreview(el);
      return;
    }
  }, [getWorldPos, commitElements, createBaseElement, setSelectedIds, setEditingTextId, setIsDrawing, setDrawingPreview, setTableDialogOpen, setTableDialogPos, setMermaidOpen, setLatexOpen, fontSize, fontFamily, textColor, stickyColor]);

  const onPointerMove = useCallback((e: PointerEvent) => {
    const s = stateRef.current;
    const world = getWorldPos(e);

    if (s.isPanning) {
      const dx = (e.clientX - s.panStart.sx) / s.viewport.zoom;
      const dy = (e.clientY - s.panStart.sy) / s.viewport.zoom;
      setViewport(vp => ({ ...vp, x: s.panStart.vx - dx, y: s.panStart.vy - dy }));
      return;
    }

    if (s.isDragging && s.dragIds.length > 0) {
      const dx = world.x - s.startWorld.x;
      const dy = world.y - s.startWorld.y;
      setElements(els => els.map(el => {
        if (!s.dragIds.includes(el.id)) return el;
        const orig = s.dragStartPositions.get(el.id);
        if (!orig) return el;
        return { ...el, x: orig.x + dx, y: orig.y + dy, version: el.version + 1, updatedAt: Date.now() };
      }));
      markDirty();
      return;
    }

    if (s.isSelecting && s.selectionRect) {
      const rect = {
        x: Math.min(world.x, s.startWorld.x),
        y: Math.min(world.y, s.startWorld.y),
        width: Math.abs(world.x - s.startWorld.x),
        height: Math.abs(world.y - s.startWorld.y),
      };
      s.selectionRect = rect;
      setDrawingPreview({ ...rect, id: '__lasso__', type: 'rectangle', angle: 0, opacity: 100, locked: false, hidden: false, groupId: null, frameId: null, zIndex: 9999, link: null, customData: {}, version: 1, updatedAt: 0, createdAt: 0, strokeColor: '#7C3AED', fillColor: 'rgba(124,58,237,0.05)', fillStyle: 'solid', strokeWidth: 1.5, strokeStyle: 'dashed', roughness: 0, roundness: 'none', seed: 0 } as AnyElement);
      return;
    }

    if (s.isDrawing) {
      const tool = s.activeTool;
      if (tool === 'freedraw') {
        s.currentPoints.push(world);
        s.pressures.push(e.pressure || 0.5);
        const pts = s.currentPoints;
        const minX = Math.min(...pts.map(p => p.x));
        const minY = Math.min(...pts.map(p => p.y));
        const maxX = Math.max(...pts.map(p => p.x));
        const maxY = Math.max(...pts.map(p => p.y));
        setDrawingPreview(prev => prev ? { ...prev, points: [...s.currentPoints], pressures: [...s.pressures], x: minX, y: minY, width: maxX - minX || 1, height: maxY - minY || 1 } as any : null);
      } else if (tool === 'arrow' || tool === 'line') {
        setDrawingPreview(prev => prev ? { ...prev, points: [s.currentPoints[0] || s.startWorld, world] } as any : null);
      } else if (isShapeTool(tool)) {
        const x = Math.min(world.x, s.startWorld.x);
        const y = Math.min(world.y, s.startWorld.y);
        const w = Math.abs(world.x - s.startWorld.x);
        const h = e.shiftKey ? w : Math.abs(world.y - s.startWorld.y);
        setDrawingPreview(prev => prev ? { ...prev, x, y, width: w || 1, height: h || 1 } : null);
      }
      return;
    }

    // Hover
    const vp = s.viewport;
    const visibleIds = rtree.query(vp.x, vp.y, vp.x + vp.width / vp.zoom, vp.y + vp.height / vp.zoom);
    const hit = visibleIds.find(id => {
      const el = s.elements.find(e => e.id === id);
      return el && isPointInElement(world.x, world.y, el);
    });
    setHoveredId(hit ?? null);
  }, [getWorldPos, setViewport, setElements, markDirty, setDrawingPreview, setHoveredId]);

  const onPointerUp = useCallback((e: PointerEvent) => {
    const s = stateRef.current;
    const world = getWorldPos(e);

    if (s.isPanning) {
      s.isPanning = false;
      const canvas = canvasRef.current;
      if (canvas) canvas.style.cursor = '';
      return;
    }

    if (s.isDragging) {
      s.isDragging = false;
      // Commit drag as history entry
      historyManager.push(s.elements, 'Move');
      rtree.rebuild(s.elements);
      markDirty();
      return;
    }

    if (s.isSelecting) {
      s.isSelecting = false;
      setDrawingPreview(null);
      if (s.selectionRect) {
        const r = s.selectionRect;
        const ids = rtree.query(r.x, r.y, r.x + r.width, r.y + r.height)
          .filter(id => {
            const el = s.elements.find(e => e.id === id);
            return el && el.x >= r.x && el.y >= r.y && el.x + el.width <= r.x + r.width && el.y + el.height <= r.y + r.height;
          });
        setSelectedIds(new Set(ids));
        s.selectionRect = null;
      }
      return;
    }

    if (s.isDrawing) {
      s.isDrawing = false;
      setIsDrawing(false);
      setDrawingPreview(null);
      const tool = s.activeTool;

      if (tool === 'freedraw' && s.currentPoints.length > 1) {
        const pts = s.currentPoints;
        const minX = Math.min(...pts.map(p => p.x));
        const minY = Math.min(...pts.map(p => p.y));
        const maxX = Math.max(...pts.map(p => p.x));
        const maxY = Math.max(...pts.map(p => p.y));
        const el: FreedrawElement = {
          ...createBaseElement('freedraw', minX, minY, maxX - minX || 1, maxY - minY || 1) as any,
          points: pts, pressures: s.pressures, smoothing: 0.5,
        };
        commitElements([...s.elements, el], 'Draw');
        s.currentPoints = [];
        s.pressures = [];
      } else if ((tool === 'arrow' || tool === 'line') && s.currentPoints.length > 0) {
        const start = s.currentPoints[0] || s.startWorld;
        if (Math.abs(world.x - start.x) > 5 || Math.abs(world.y - start.y) > 5) {
          const minX = Math.min(start.x, world.x);
          const minY = Math.min(start.y, world.y);
          const maxX = Math.max(start.x, world.x);
          const maxY = Math.max(start.y, world.y);
          const el: ArrowElement = {
            ...createBaseElement(tool as 'arrow' | 'line', minX, minY, maxX - minX, maxY - minY) as any,
            points: [start, world], arrowType: 'normal',
            startCap: 'none', endCap: tool === 'arrow' ? 'arrow' : 'none',
            startBindingId: null, endBindingId: null, label: '', waypoints: [],
          };
          commitElements([...s.elements, el], `Add ${tool}`);
        }
        s.currentPoints = [];
      } else if (isShapeTool(tool)) {
        const x = Math.min(world.x, s.startWorld.x);
        const y = Math.min(world.y, s.startWorld.y);
        let w = Math.abs(world.x - s.startWorld.x);
        let h = e.shiftKey ? w : Math.abs(world.y - s.startWorld.y);
        if (w < 5 && h < 5) { w = 120; h = 80; }
        const el = createBaseElement(tool as AnyElement['type'], x, y, w, h);
        commitElements([...s.elements, el], `Add ${tool}`);
        setSelectedIds(new Set([el.id]));
      }
    }
  }, [getWorldPos, setIsDrawing, setDrawingPreview, setSelectedIds, commitElements, createBaseElement, canvasRef, markDirty]);

  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const vp = stateRef.current.viewport;

    if (e.ctrlKey || e.metaKey) {
      const delta = -e.deltaY * 0.01;
      const newZoom = vp.zoom * (1 + delta);
      setViewport(zoomAtPoint(vp, newZoom, { x: sx, y: sy }));
    } else if (e.shiftKey) {
      setViewport(v => ({ ...v, x: v.x + e.deltaY / v.zoom }));
    } else {
      setViewport(v => ({ ...v, x: v.x + e.deltaX / v.zoom, y: v.y + e.deltaY / v.zoom }));
    }
  }, [canvasRef, setViewport]);

  const onDoubleClick = useCallback((e: MouseEvent) => {
    const s = stateRef.current;
    const world = getWorldPos(e as any);
    const vp = s.viewport;
    const visibleIds = rtree.query(vp.x, vp.y, vp.x + vp.width / vp.zoom, vp.y + vp.height / vp.zoom);
    const hit = visibleIds
      .map(id => s.elements.find(el => el.id === id))
      .filter(Boolean)
      .find(el => isPointInElement(world.x, world.y, el!)) as AnyElement | undefined;

    if (hit && (hit.type === 'text' || hit.type === 'sticky-note')) {
      setEditingTextId(hit.id);
    } else if (!hit) {
      // Double click on empty: create text
      const el: TextElement = {
        ...createBaseElement('text', world.x, world.y, 200, 40) as any,
        content: '', fontSize, fontFamily, fontWeight: 'normal', fontStyle: '',
        textDecoration: '', textAlign: 'left', lineHeight: 1.4, letterSpacing: 0,
        textColor, textBackground: 'transparent', markdownMode: false,
      };
      commitElements([...s.elements, el], 'Add text');
      setEditingTextId(el.id);
    }
  }, [getWorldPos, setEditingTextId, createBaseElement, fontSize, fontFamily, textColor, commitElements]);

  const onContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
    const world = getWorldPos(e as any);
    const s = stateRef.current;
    const vp = s.viewport;
    const visibleIds = rtree.query(vp.x, vp.y, vp.x + vp.width / vp.zoom, vp.y + vp.height / vp.zoom);
    const hit = visibleIds
      .map(id => s.elements.find(el => el.id === id))
      .filter(Boolean)
      .find(el => isPointInElement(world.x, world.y, el!)) as AnyElement | undefined;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    setContextMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top, elementId: hit?.id ?? null });
  }, [getWorldPos, setContextMenu, canvasRef]);

  return { onPointerDown, onPointerMove, onPointerUp, onWheel, onDoubleClick, onContextMenu };
}

function isShapeTool(tool: Tool): boolean {
  return ['rectangle', 'diamond', 'ellipse', 'triangle', 'star', 'pentagon', 'hexagon',
    'parallelogram', 'trapezoid', 'octagon', 'cylinder', 'callout', 'cloud', 'cross',
    'database', 'frame', 'zone', 'portal'].includes(tool);
}
