import { useState, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { NoteMetadata } from "@/lib/notesFirestore";

interface CanvasNodeData { noteId: string; x: number; y: number; width: number; height: number; }
interface Props { notes: NoteMetadata[]; canvasNodes: CanvasNodeData[]; onUpdateNodes: (n: CanvasNodeData[]) => void; onSelectNote: (id: string) => void; contents: Record<string, string>; }

export const CanvasView = ({ notes, canvasNodes, onUpdateNodes, onSelectNote, contents }: Props) => {
  const [dragging, setDragging] = useState<string|null>(null);
  const [offset, setOffset] = useState({x:0,y:0});
  const ref = useRef<HTMLDivElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const noteId = e.dataTransfer.getData("noteId");
    if (!noteId || canvasNodes.some(n=>n.noteId===noteId)) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    onUpdateNodes([...canvasNodes, { noteId, x: e.clientX-rect.left-80, y: e.clientY-rect.top-30, width: 200, height: 100 }]);
  };

  return (
    <div ref={ref} className="flex-1 bg-background relative overflow-hidden" onDragOver={e=>e.preventDefault()} onDrop={handleDrop}
      onPointerMove={e=>{ if(!dragging)return; onUpdateNodes(canvasNodes.map(n=>n.noteId===dragging?{...n,x:e.clientX-offset.x,y:e.clientY-offset.y}:n)); }}
      onPointerUp={()=>setDragging(null)}>
      <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage:"radial-gradient(circle,hsl(var(--foreground)) 1px,transparent 1px)",backgroundSize:"24px 24px"}}/>
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {canvasNodes.map((a,i)=>canvasNodes.slice(i+1).map((b,j)=>{
          const na=notes.find(n=>n.id===a.noteId), nb=notes.find(n=>n.id===b.noteId);
          if(!na||!nb) return null;
          const ca=contents[a.noteId]||"";
          if(!new RegExp(`\\[\\[${nb.title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\]\\]`,'i').test(ca)) return null;
          return <line key={`${i}-${j}`} x1={a.x+a.width/2} y1={a.y+a.height/2} x2={b.x+b.width/2} y2={b.y+b.height/2} stroke="hsl(var(--primary)/0.3)" strokeWidth={1.5} strokeDasharray="4 4"/>;
        }))}
      </svg>
      {canvasNodes.map(node=>{ const note=notes.find(n=>n.id===node.noteId); if(!note)return null; const preview=(contents[node.noteId]||"").replace(/<[^>]+>/g,"").slice(0,100); return (
        <div key={node.noteId} className={cn("absolute rounded-xl border bg-card shadow-lg p-3 cursor-grab active:cursor-grabbing",dragging===node.noteId&&"shadow-xl ring-2 ring-primary/30")}
          style={{left:node.x,top:node.y,width:node.width,minHeight:node.height}}
          onPointerDown={e=>{setDragging(node.noteId);setOffset({x:e.clientX-node.x,y:e.clientY-node.y});(e.target as HTMLElement).setPointerCapture(e.pointerId);}}
          onDoubleClick={()=>onSelectNote(node.noteId)}>
          <p className="text-xs font-heading font-semibold mb-1 truncate">{note.icon?`${note.icon} `:""}{note.title}</p>
          <p className="text-[10px] text-muted-foreground/60 font-body line-clamp-3">{preview||"Empty"}</p>
        </div>
      );})}
      {canvasNodes.length===0&&<div className="absolute inset-0 flex items-center justify-center"><p className="text-sm text-muted-foreground/30 font-body">Drag notes from sidebar to canvas</p></div>}
    </div>
  );
};
