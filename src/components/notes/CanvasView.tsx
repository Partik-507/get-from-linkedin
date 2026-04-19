import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { NoteMetadata } from "@/lib/notesFirestore";
import { Maximize2, Minimize2, Plus } from "lucide-react";

interface CanvasNodeData { noteId: string; x: number; y: number; width: number; height: number; }
interface Props {
  notes: NoteMetadata[];
  canvasNodes: CanvasNodeData[];
  onUpdateNodes: (n: CanvasNodeData[]) => void;
  onSelectNote: (id: string) => void;
  contents: Record<string, string>;
  readOnly?: boolean;
}

/**
 * CanvasView v2 — Infinite pannable, zoomable board with snap-to-8 grid.
 * - Pan: drag empty space (or two-finger touch)
 * - Zoom: wheel + ctrl/⌘ or pinch
 * - Drag: drag a node by its body
 * - Drop: drag note from sidebar (dataTransfer "noteId") onto canvas
 * - Read-only mode disables drag/drop/delete (Public Workspace for non-admin)
 */
export const CanvasView = ({ notes, canvasNodes, onUpdateNodes, onSelectNote, contents, readOnly = false }: Props) => {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [panning, setPanning] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (sx - rect.left - pan.x) / zoom,
      y: (sy - rect.top - pan.y) / zoom,
    };
  }, [pan, zoom]);

  const snap = (n: number) => Math.round(n / 8) * 8;

  // Wheel zoom (ctrl/⌘) + pan (regular)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const rect = el.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
        const newZoom = Math.max(0.25, Math.min(3, zoom * factor));
        // Zoom around pointer
        const wx = (cx - pan.x) / zoom;
        const wy = (cy - pan.y) / zoom;
        setPan({ x: cx - wx * newZoom, y: cy - wy * newZoom });
        setZoom(newZoom);
      } else {
        e.preventDefault();
        setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoom, pan]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (readOnly) return;
    const noteId = e.dataTransfer.getData("noteId");
    if (!noteId || canvasNodes.some((n) => n.noteId === noteId)) return;
    const w = screenToWorld(e.clientX, e.clientY);
    onUpdateNodes([...canvasNodes, { noteId, x: snap(w.x - 100), y: snap(w.y - 30), width: 200, height: 100 }]);
  };

  const addBlankNode = () => {
    if (readOnly) return;
    const noteId = notes[0]?.id;
    if (!noteId) return;
    const cx = (containerRef.current?.clientWidth || 800) / 2;
    const cy = (containerRef.current?.clientHeight || 600) / 2;
    const w = screenToWorld(cx, cy);
    onUpdateNodes([...canvasNodes, { noteId, x: snap(w.x - 100), y: snap(w.y - 30), width: 200, height: 100 }]);
  };

  const onPointerDownBg = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-canvas-node]")) return;
    setPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMoveBg = (e: React.PointerEvent) => {
    if (panning) {
      setPan({ x: panStart.current.panX + (e.clientX - panStart.current.x), y: panStart.current.panY + (e.clientY - panStart.current.y) });
      return;
    }
    if (draggingNode) {
      const w = screenToWorld(e.clientX, e.clientY);
      onUpdateNodes(canvasNodes.map((n) => n.noteId === draggingNode ? { ...n, x: snap(w.x - dragOffset.current.x), y: snap(w.y - dragOffset.current.y) } : n));
    }
  };
  const onPointerUpBg = () => { setPanning(false); setDraggingNode(null); };

  return (
    <div
      ref={containerRef}
      className="flex-1 bg-background relative overflow-hidden touch-none select-none"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onPointerDown={onPointerDownBg}
      onPointerMove={onPointerMoveBg}
      onPointerUp={onPointerUpBg}
      onPointerCancel={onPointerUpBg}
      style={{ cursor: panning ? "grabbing" : "grab" }}
    >
      {/* Dotted grid (translates with pan, scales lightly with zoom) */}
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      />

      {/* World layer */}
      <div
        className="absolute top-0 left-0 origin-top-left pointer-events-none"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, width: 0, height: 0 }}
      >
        {/* SVG link overlay */}
        <svg className="absolute" style={{ overflow: "visible", pointerEvents: "none" }}>
          {canvasNodes.map((a, i) => canvasNodes.slice(i + 1).map((b, j) => {
            const na = notes.find((n) => n.id === a.noteId), nb = notes.find((n) => n.id === b.noteId);
            if (!na || !nb) return null;
            const ca = contents[a.noteId] || "";
            if (!new RegExp(`\\[\\[${nb.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\]\\]`, "i").test(ca)) return null;
            const x1 = a.x + a.width / 2, y1 = a.y + a.height / 2;
            const x2 = b.x + b.width / 2, y2 = b.y + b.height / 2;
            const mx = (x1 + x2) / 2;
            return (
              <path key={`${i}-${j}`} d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                stroke="hsl(var(--primary) / 0.4)" strokeWidth={1.5} fill="none" strokeDasharray="4 4" />
            );
          }))}
        </svg>

        {/* Nodes */}
        {canvasNodes.map((node) => {
          const note = notes.find((n) => n.id === node.noteId);
          if (!note) return null;
          const preview = (contents[node.noteId] || "").replace(/<[^>]+>/g, "").slice(0, 100);
          const active = draggingNode === node.noteId;
          return (
            <div
              key={node.noteId}
              data-canvas-node
              className={cn(
                "absolute rounded-xl border bg-card shadow-lg p-3 pointer-events-auto",
                readOnly ? "cursor-pointer" : "cursor-grab active:cursor-grabbing",
                active && "shadow-xl ring-2 ring-primary/40"
              )}
              style={{ left: node.x, top: node.y, width: node.width, minHeight: node.height }}
              onPointerDown={(e) => {
                e.stopPropagation();
                if (readOnly) return;
                const w = screenToWorld(e.clientX, e.clientY);
                dragOffset.current = { x: w.x - node.x, y: w.y - node.y };
                setDraggingNode(node.noteId);
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
              }}
              onDoubleClick={() => onSelectNote(node.noteId)}
              onClick={(e) => { if (readOnly) onSelectNote(node.noteId); }}
            >
              <p className="text-xs font-heading font-semibold mb-1 truncate">{note.icon ? `${note.icon} ` : ""}{note.title}</p>
              <p className="text-[10px] text-muted-foreground/60 font-body line-clamp-3">{preview || "Empty"}</p>
            </div>
          );
        })}
      </div>

      {/* Mini toolbar (zoom + reset) */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-card/80 backdrop-blur border border-border/40 rounded-xl px-1.5 py-1 shadow-lg">
        <button className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-muted/50 active:scale-95" onClick={() => setZoom((z) => Math.max(0.25, z / 1.2))} title="Zoom out">
          <Minimize2 className="h-3.5 w-3.5" />
        </button>
        <span className="text-[10px] font-mono w-10 text-center text-muted-foreground tabular-nums">{Math.round(zoom * 100)}%</span>
        <button className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-muted/50 active:scale-95" onClick={() => setZoom((z) => Math.min(3, z * 1.2))} title="Zoom in">
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
        <span className="w-px h-4 bg-border/50 mx-1" />
        <button className="h-7 px-2 rounded-lg flex items-center justify-center hover:bg-muted/50 active:scale-95 text-[10px] font-body" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} title="Reset view">
          Fit
        </button>
      </div>

      {/* Mini-map */}
      {canvasNodes.length > 0 && (
        <div className="absolute bottom-3 left-3 w-40 h-24 bg-card/80 backdrop-blur border border-border/40 rounded-lg overflow-hidden shadow-lg pointer-events-none">
          {(() => {
            const xs = canvasNodes.map((n) => n.x);
            const ys = canvasNodes.map((n) => n.y);
            const minX = Math.min(...xs, 0), maxX = Math.max(...xs.map((x, i) => x + canvasNodes[i].width), 200);
            const minY = Math.min(...ys, 0), maxY = Math.max(...ys.map((y, i) => y + canvasNodes[i].height), 100);
            const sx = 160 / Math.max(1, maxX - minX);
            const sy = 96 / Math.max(1, maxY - minY);
            const s = Math.min(sx, sy, 1);
            return canvasNodes.map((n) => (
              <div key={n.noteId} className="absolute bg-primary/40 rounded-sm" style={{
                left: (n.x - minX) * s, top: (n.y - minY) * s,
                width: n.width * s, height: n.height * s,
              }} />
            ));
          })()}
        </div>
      )}

      {/* Empty state */}
      {canvasNodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="h-12 w-12 rounded-2xl bg-muted/30 mx-auto mb-3 flex items-center justify-center">
              <Plus className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground/60 font-body">{readOnly ? "Empty canvas" : "Drag notes from sidebar to canvas"}</p>
            <p className="text-[11px] text-muted-foreground/40 font-body mt-1">Pinch / ⌘+wheel to zoom · drag empty space to pan</p>
          </div>
        </div>
      )}
    </div>
  );
};
