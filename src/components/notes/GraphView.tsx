import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";

interface NoteRef {
  id: string;
  title: string;
  content: string;
  folderId: string;
}

interface Props {
  notes: NoteRef[];
  onSelectNote: (id: string) => void;
}

interface GraphNode {
  id: string;
  title: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  linkCount: number;
  folderId: string;
}

interface GraphEdge {
  from: string;
  to: string;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(200, 80%, 50%)",
  "hsl(300, 60%, 50%)",
];

export const GraphView = ({ notes, onSelectNote }: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [viewBox, setViewBox] = useState({ x: -300, y: -200, w: 600, h: 400 });
  const [dragging, setDragging] = useState<string | null>(null);
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const frameRef = useRef(0);
  const nodesRef = useRef<GraphNode[]>([]);

  const edges = useMemo(() => {
    const result: GraphEdge[] = [];
    notes.forEach(n => {
      const matches = n.content?.match(/\[\[([^\]]+)\]\]/g) || [];
      matches.forEach(m => {
        const title = m.replace(/\[\[|\]\]/g, "");
        const target = notes.find(t => t.title.toLowerCase() === title.toLowerCase() && t.id !== n.id);
        if (target) result.push({ from: n.id, to: target.id });
      });
    });
    return result;
  }, [notes]);

  // Initialize nodes
  useEffect(() => {
    const linkCounts: Record<string, number> = {};
    edges.forEach(e => {
      linkCounts[e.from] = (linkCounts[e.from] || 0) + 1;
      linkCounts[e.to] = (linkCounts[e.to] || 0) + 1;
    });

    const initial: GraphNode[] = notes.map((n, i) => ({
      id: n.id,
      title: n.title,
      x: (Math.random() - 0.5) * 400,
      y: (Math.random() - 0.5) * 300,
      vx: 0,
      vy: 0,
      linkCount: linkCounts[n.id] || 0,
      folderId: n.folderId,
    }));
    nodesRef.current = initial;
    setNodes(initial);

    // Run physics
    let frame = 0;
    const maxFrames = 120;
    const tick = () => {
      if (frame >= maxFrames) return;
      const ns = nodesRef.current;
      const damping = 0.9;
      const repulsion = 3000;
      const attraction = 0.01;
      const centerPull = 0.001;

      for (let i = 0; i < ns.length; i++) {
        let fx = 0, fy = 0;
        // Repulsion
        for (let j = 0; j < ns.length; j++) {
          if (i === j) continue;
          const dx = ns[i].x - ns[j].x;
          const dy = ns[i].y - ns[j].y;
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
          const force = repulsion / (dist * dist);
          fx += (dx / dist) * force;
          fy += (dy / dist) * force;
        }
        // Attraction along edges
        edges.forEach(e => {
          let other: GraphNode | undefined;
          if (e.from === ns[i].id) other = ns.find(n => n.id === e.to);
          else if (e.to === ns[i].id) other = ns.find(n => n.id === e.from);
          if (other) {
            const dx = other.x - ns[i].x;
            const dy = other.y - ns[i].y;
            fx += dx * attraction;
            fy += dy * attraction;
          }
        });
        // Center pull
        fx -= ns[i].x * centerPull;
        fy -= ns[i].y * centerPull;

        ns[i].vx = (ns[i].vx + fx) * damping;
        ns[i].vy = (ns[i].vy + fy) * damping;
        ns[i].x += ns[i].vx;
        ns[i].y += ns[i].vy;
      }

      setNodes([...ns]);
      frame++;
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameRef.current);
  }, [notes, edges]);

  const folderIds = useMemo(() => [...new Set(notes.map(n => n.folderId))], [notes]);

  const getColor = (folderId: string) => COLORS[folderIds.indexOf(folderId) % COLORS.length];

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    setViewBox(v => ({
      x: v.x + v.w * (1 - factor) / 2,
      y: v.y + v.h * (1 - factor) / 2,
      w: v.w * factor,
      h: v.h * factor,
    }));
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !dragging) {
      setPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (panning) {
      const dx = (e.clientX - panStart.x) * (viewBox.w / 600);
      const dy = (e.clientY - panStart.y) * (viewBox.h / 400);
      setViewBox(v => ({ ...v, x: v.x - dx, y: v.y - dy }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
    if (dragging && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const x = viewBox.x + ((e.clientX - rect.left) / rect.width) * viewBox.w;
      const y = viewBox.y + ((e.clientY - rect.top) / rect.height) * viewBox.h;
      nodesRef.current = nodesRef.current.map(n => n.id === dragging ? { ...n, x, y } : n);
      setNodes([...nodesRef.current]);
    }
  };

  const handleMouseUp = () => {
    setPanning(false);
    setDragging(null);
  };

  return (
    <div className="flex-1 bg-accent/10 rounded-xl overflow-hidden relative">
      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Edges */}
        {edges.map((edge, i) => {
          const from = nodes.find(n => n.id === edge.from);
          const to = nodes.find(n => n.id === edge.to);
          if (!from || !to) return null;
          return (
            <line
              key={i}
              x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke="hsl(var(--primary))"
              strokeWidth={1.5}
              opacity={hoveredId && (hoveredId === edge.from || hoveredId === edge.to) ? 0.8 : 0.2}
            />
          );
        })}
        {/* Nodes */}
        {nodes.map(node => {
          const r = 12 + node.linkCount * 4;
          const isHovered = hoveredId === node.id;
          return (
            <g
              key={node.id}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredId(node.id)}
              onMouseLeave={() => setHoveredId(null)}
              onMouseDown={(e) => { e.stopPropagation(); setDragging(node.id); }}
              onClick={() => onSelectNote(node.id)}
            >
              <circle
                cx={node.x} cy={node.y} r={r}
                fill={isHovered ? getColor(node.folderId) : "hsl(var(--card))"}
                stroke={getColor(node.folderId)}
                strokeWidth={isHovered ? 3 : 2}
                opacity={hoveredId && !isHovered ? 0.5 : 1}
              />
              <text
                x={node.x} y={node.y + r + 12}
                textAnchor="middle"
                fontSize={10}
                fill="hsl(var(--foreground))"
                opacity={isHovered ? 1 : 0.7}
                className="font-body pointer-events-none select-none"
              >
                {node.title.slice(0, 16)}{node.title.length > 16 ? "…" : ""}
              </text>
            </g>
          );
        })}
      </svg>
      {/* Legend */}
      <div className="absolute bottom-3 left-3 text-[10px] text-muted-foreground font-body bg-background/80 backdrop-blur-sm rounded-md px-2 py-1">
        {notes.length} notes · {edges.length} links · Scroll to zoom · Drag to pan
      </div>
    </div>
  );
};
