import { useEffect, useRef, useMemo, useState } from "react";
import type { NoteMetadata } from "@/lib/notesFirestore";

interface GNode { id: string; title: string; x: number; y: number; vx: number; vy: number; links: number; color: string; }
interface GEdge { from: string; to: string; }
interface Props { notes: NoteMetadata[]; contents: Record<string, string>; onSelectNote: (id: string) => void; }

const COLORS = ["hsl(263,70%,58%)","hsl(200,70%,50%)","hsl(340,70%,50%)","hsl(150,60%,45%)","hsl(30,80%,50%)"];

export const GraphView = ({ notes, contents, onSelectNote }: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hovered, setHovered] = useState<string|null>(null);
  const [viewBox, setViewBox] = useState({ x: -400, y: -300, w: 800, h: 600 });
  const nodesRef = useRef<GNode[]>([]);
  const [, forceUpdate] = useState(0);

  const edges = useMemo(() => {
    const r: GEdge[] = [];
    notes.forEach(n => {
      const c = contents[n.id] || "";
      (c.match(/\[\[([^\]]+)\]\]/g) || []).forEach(m => {
        const t = notes.find(x => x.title.toLowerCase() === m.replace(/\[\[|\]\]/g, "").trim().toLowerCase() && x.id !== n.id);
        if (t) r.push({ from: n.id, to: t.id });
      });
    });
    return r;
  }, [notes, contents]);

  useEffect(() => {
    const folders = [...new Set(notes.map(n => n.folderId))];
    nodesRef.current = notes.map(n => ({ id: n.id, title: n.title, x: (Math.random()-.5)*500, y: (Math.random()-.5)*400, vx: 0, vy: 0, links: edges.filter(e => e.from===n.id||e.to===n.id).length, color: COLORS[folders.indexOf(n.folderId)%COLORS.length] }));
    let frame = 0;
    const animate = () => {
      const ns = nodesRef.current;
      for (let i=0;i<ns.length;i++) for (let j=i+1;j<ns.length;j++) { const dx=ns[j].x-ns[i].x,dy=ns[j].y-ns[i].y,d=Math.max(Math.sqrt(dx*dx+dy*dy),1),f=3000/(d*d); ns[i].vx-=(dx/d)*f; ns[i].vy-=(dy/d)*f; ns[j].vx+=(dx/d)*f; ns[j].vy+=(dy/d)*f; }
      edges.forEach(e => { const a=ns.find(n=>n.id===e.from),b=ns.find(n=>n.id===e.to); if(!a||!b)return; const dx=b.x-a.x,dy=b.y-a.y,d=Math.sqrt(dx*dx+dy*dy),f=(d-100)*0.005; a.vx+=(dx/d)*f; a.vy+=(dy/d)*f; b.vx-=(dx/d)*f; b.vy-=(dy/d)*f; });
      ns.forEach(n => { n.vx-=n.x*0.001; n.vy-=n.y*0.001; n.vx*=0.92; n.vy*=0.92; n.x+=n.vx; n.y+=n.vy; });
      frame++; forceUpdate(f=>f+1);
      if (frame<120) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [notes.length, edges.length]);

  const handleWheel = (e: React.WheelEvent) => { e.preventDefault(); const f=e.deltaY>0?1.1:0.9; setViewBox(v=>({x:v.x+v.w*(1-f)/2,y:v.y+v.h*(1-f)/2,w:v.w*f,h:v.h*f})); };
  const nodes = nodesRef.current;

  return (
    <div className="flex-1 bg-background">
      <svg ref={svgRef} viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`} className="w-full h-full" onWheel={handleWheel}>
        {edges.map((e,i)=>{ const a=nodes.find(n=>n.id===e.from),b=nodes.find(n=>n.id===e.to); if(!a||!b)return null; const h=hovered===e.from||hovered===e.to; return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={h?"hsl(263,70%,58%)":"hsl(var(--border))"} strokeWidth={h?2:1} opacity={h?0.8:0.3}/>; })}
        {nodes.map(n=>{ const r=Math.max(6,Math.min(16,6+n.links*2)),h=hovered===n.id; return (
          <g key={n.id} cursor="pointer" onMouseEnter={()=>setHovered(n.id)} onMouseLeave={()=>setHovered(null)} onClick={()=>onSelectNote(n.id)}>
            <circle cx={n.x} cy={n.y} r={r} fill={n.color} opacity={h?1:0.7} stroke={h?"white":"transparent"} strokeWidth={2}/>
            {h && <text x={n.x} y={n.y-r-6} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="11" fontFamily="DM Sans">{n.title}</text>}
          </g>
        );})}
      </svg>
    </div>
  );
};
