import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { FileText, X } from "lucide-react";

interface NoteRef {
  id: string;
  title: string;
  content: string;
}

interface CanvasNode {
  noteId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  notes: NoteRef[];
  canvasNodes: CanvasNode[];
  onUpdateNodes: (nodes: CanvasNode[]) => void;
  onSelectNote: (id: string) => void;
  edges: { from: string; to: string }[];
}

export const CanvasView = ({ notes, canvasNodes, onUpdateNodes, onSelectNote, edges }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragInfo, setDragInfo] = useState<{ noteId: string; offsetX: number; offsetY: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent, noteId: string) => {
    e.preventDefault();
    const node = canvasNodes.find(n => n.noteId === noteId);
    if (!node) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDragInfo({
      noteId,
      offsetX: e.clientX - rect.left - node.x,
      offsetY: e.clientY - rect.top - node.y,
    });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragInfo || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, e.clientX - rect.left - dragInfo.offsetX);
    const y = Math.max(0, e.clientY - rect.top - dragInfo.offsetY);
    onUpdateNodes(canvasNodes.map(n => n.noteId === dragInfo.noteId ? { ...n, x, y } : n));
  }, [dragInfo, canvasNodes, onUpdateNodes]);

  const handlePointerUp = () => setDragInfo(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const noteId = e.dataTransfer.getData("noteId");
    if (!noteId || canvasNodes.find(n => n.noteId === noteId)) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    onUpdateNodes([...canvasNodes, {
      noteId,
      x: e.clientX - rect.left - 80,
      y: e.clientY - rect.top - 30,
      width: 200,
      height: 100,
    }]);
  };

  const removeNode = (noteId: string) => {
    onUpdateNodes(canvasNodes.filter(n => n.noteId !== noteId));
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 relative bg-accent/5 overflow-auto"
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Dot grid background */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: "radial-gradient(circle, hsl(var(--muted-foreground)) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }} />

      {/* Edge lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {edges.map((edge, i) => {
          const from = canvasNodes.find(n => n.noteId === edge.from);
          const to = canvasNodes.find(n => n.noteId === edge.to);
          if (!from || !to) return null;
          return (
            <line
              key={i}
              x1={from.x + from.width / 2} y1={from.y + from.height / 2}
              x2={to.x + to.width / 2} y2={to.y + to.height / 2}
              stroke="hsl(var(--primary))"
              strokeWidth={1.5}
              strokeDasharray="6 3"
              opacity={0.4}
            />
          );
        })}
      </svg>

      {/* Cards */}
      {canvasNodes.map(node => {
        const note = notes.find(n => n.id === node.noteId);
        if (!note) return null;
        const snippet = note.content?.replace(/<[^>]+>/g, "").slice(0, 120) || "";
        return (
          <div
            key={node.noteId}
            className={cn(
              "absolute bg-card border border-border/60 rounded-lg shadow-sm cursor-move select-none group transition-shadow hover:shadow-md",
              dragInfo?.noteId === node.noteId && "shadow-lg ring-2 ring-primary/30"
            )}
            style={{ left: node.x, top: node.y, width: node.width, minHeight: node.height }}
            onPointerDown={e => handlePointerDown(e, node.noteId)}
            onDoubleClick={() => onSelectNote(node.noteId)}
          >
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30">
              <FileText className="h-3 w-3 text-primary shrink-0" />
              <span className="text-xs font-body font-medium truncate flex-1">{note.title}</span>
              <button
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
                onClick={(e) => { e.stopPropagation(); removeNode(node.noteId); }}
                onPointerDown={e => e.stopPropagation()}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <div className="px-3 py-2 text-[10px] text-muted-foreground font-body line-clamp-4">
              {snippet || "Empty note"}
            </div>
          </div>
        );
      })}

      {canvasNodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <FileText className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground font-body">Drag notes from sidebar to add to canvas</p>
          </div>
        </div>
      )}
    </div>
  );
};
