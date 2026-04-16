import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { NoteMetadata } from "@/lib/notesFirestore";
import { cn } from "@/lib/utils";
import { ZoomIn, ZoomOut, RefreshCw, AlertTriangle, Network } from "lucide-react";

interface Props {
  notes: NoteMetadata[];
  contents: Record<string, string>;
  onSelectNote: (id: string) => void;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  title: string;
  connections: number;
  icon?: string;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
}

function extractLinks(content: string, allNotes: NoteMetadata[]): string[] {
  const wikiMatches = content.match(/\[\[([^\]]+)\]\]/g) || [];
  const pageLinkMatches = content.match(/data-page-link="([^"]+)"/g) || [];
  const linked: string[] = [];

  wikiMatches.forEach(m => {
    const title = m.replace(/\[\[|\]\]/g, "").trim();
    const target = allNotes.find(n => n.title.toLowerCase() === title.toLowerCase());
    if (target) linked.push(target.id);
  });
  pageLinkMatches.forEach(m => {
    const id = m.match(/data-page-link="([^"]+)"/)?.[1];
    if (id) linked.push(id);
  });

  return [...new Set(linked)];
}

export const GraphView = ({ notes, contents, onSelectNote }: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [nodeCount, setNodeCount] = useState(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const buildGraph = (width: number, height: number) => {
    if (!svgRef.current || width === 0 || height === 0) return;

    try {
      setError(null);
      simRef.current?.stop();

      // Build data
      const nodeMap = new Map<string, GraphNode>();
      notes.forEach(n => nodeMap.set(n.id, { id: n.id, title: n.title || "Untitled", connections: 0, icon: n.icon }));

      const links: GraphLink[] = [];
      notes.forEach(n => {
        const content = contents[n.id] || "";
        const targets = extractLinks(content, notes);
        targets.forEach(tid => {
          if (nodeMap.has(tid)) {
            links.push({ source: n.id, target: tid });
            nodeMap.get(n.id)!.connections++;
            nodeMap.get(tid)!.connections++;
          }
        });
      });

      // Also add hierarchy links (parent→child)
      notes.forEach(n => {
        if (n.properties?.parentId && nodeMap.has(n.properties.parentId)) {
          links.push({ source: n.properties.parentId, target: n.id });
        }
      });

      const nodes = [...nodeMap.values()];
      setNodeCount(nodes.length);

      // Initialize node positions in a circle to avoid 0,0 collapse
      const cx = width / 2, cy = height / 2;
      nodes.forEach((node, i) => {
        const angle = (2 * Math.PI * i) / nodes.length;
        const r = Math.min(width, height) * 0.3;
        node.x = cx + r * Math.cos(angle);
        node.y = cy + r * Math.sin(angle);
      });

      const svg = d3.select(svgRef.current)
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`);

      svg.selectAll("*").remove();

      // Defs: arrow marker
      svg.append("defs").append("marker")
        .attr("id", "gv-arrow")
        .attr("viewBox", "0 -4 8 8")
        .attr("refX", 22).attr("refY", 0)
        .attr("markerWidth", 5).attr("markerHeight", 5)
        .attr("orient", "auto")
        .append("path").attr("d", "M0,-4L8,0L0,4")
        .attr("fill", "hsl(var(--primary) / 0.5)");

      const g = svg.append("g");

      // Zoom
      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 5])
        .on("zoom", ev => g.attr("transform", ev.transform));
      zoomRef.current = zoom;
      svg.call(zoom);

      const radius = (n: GraphNode) => Math.max(8, Math.min(28, 8 + Math.sqrt(n.connections + 1) * 4));

      // Simulation
      const sim = d3.forceSimulation<GraphNode>(nodes)
        .force("link", d3.forceLink<GraphNode, GraphLink>(links).id(d => d.id).distance(120).strength(0.5))
        .force("charge", d3.forceManyBody().strength(-300).distanceMax(400))
        .force("center", d3.forceCenter(width / 2, height / 2).strength(0.1))
        .force("collision", d3.forceCollide<GraphNode>().radius(d => radius(d) + 10));
      simRef.current = sim;

      // Links
      const linkSel = g.append("g").selectAll<SVGLineElement, GraphLink>("line")
        .data(links).join("line")
        .attr("stroke", "hsl(var(--border))")
        .attr("stroke-width", 1.5)
        .attr("stroke-opacity", 0.5)
        .attr("marker-end", "url(#gv-arrow)");

      // Nodes
      const drag = d3.drag<SVGGElement, GraphNode>()
        .on("start", (ev, d) => { if (!ev.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on("drag", (ev, d) => { d.fx = ev.x; d.fy = ev.y; })
        .on("end", (ev, d) => { if (!ev.active) sim.alphaTarget(0); d.fx = null; d.fy = null; });

      const nodeG = g.append("g").selectAll<SVGGElement, GraphNode>("g")
        .data(nodes).join("g")
        .style("cursor", "pointer")
        .call(drag);

      nodeG.append("circle")
        .attr("r", d => radius(d))
        .attr("fill", d =>
          d.connections > 4 ? "hsl(var(--primary))" :
          d.connections > 1 ? "hsl(var(--primary) / 0.7)" :
          "hsl(var(--primary) / 0.4)"
        )
        .attr("stroke", "hsl(var(--background))")
        .attr("stroke-width", 2.5)
        .on("mouseenter", (_, d) => setHoveredId(d.id))
        .on("mouseleave", () => setHoveredId(null))
        .on("click", (_, d) => onSelectNote(d.id));

      nodeG.filter(d => !!d.icon).append("text")
        .attr("text-anchor", "middle").attr("dominant-baseline", "middle")
        .attr("font-size", d => `${Math.max(10, radius(d) - 2)}px`)
        .text(d => d.icon || "")
        .style("pointer-events", "none");

      nodeG.append("text")
        .attr("dy", d => radius(d) + 16)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .attr("font-family", "DM Sans, Inter, sans-serif")
        .attr("fill", "hsl(var(--muted-foreground))")
        .text(d => d.title.length > 18 ? d.title.slice(0, 18) + "…" : d.title)
        .style("pointer-events", "none");

      // Tick update
      sim.on("tick", () => {
        linkSel
          .attr("x1", d => (d.source as GraphNode).x ?? 0)
          .attr("y1", d => (d.source as GraphNode).y ?? 0)
          .attr("x2", d => (d.target as GraphNode).x ?? 0)
          .attr("y2", d => (d.target as GraphNode).y ?? 0);
        nodeG.attr("transform", d => `translate(${d.x ?? 0},${d.y ?? 0})`);
      });

      // Auto-fit after simulation settles
      sim.on("end", () => {
        if (!svgRef.current || !zoomRef.current) return;
        try {
          const bounds = (g.node() as SVGGElement).getBBox();
          const dx = bounds.width, dy = bounds.height;
          if (dx === 0 || dy === 0) return;
          const scale = 0.85 / Math.max(dx / width, dy / height);
          const tx = width / 2 - scale * (bounds.x + dx / 2);
          const ty = height / 2 - scale * (bounds.y + dy / 2);
          d3.select(svgRef.current).transition().duration(400)
            .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
        } catch {}
      });

    } catch (err: any) {
      console.error("[GraphView]", err);
      setError(err?.message || "Failed to render graph");
    }
  };

  // ResizeObserver is the single driver for graph initialization
  useEffect(() => {
    if (!containerRef.current) return;

    let animFrame: number;
    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (!entry) return;
      // Use rAF to ensure DOM has settled
      cancelAnimationFrame(animFrame);
      animFrame = requestAnimationFrame(() => {
        const { width, height } = entry.contentRect;
        buildGraph(Math.floor(width), Math.floor(height));
      });
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(animFrame);
      simRef.current?.stop();
    };
  }, [notes, contents, onSelectNote]); // rebuild when data changes

  // Hover highlight
  useEffect(() => {
    if (!svgRef.current) return;
    d3.select(svgRef.current).selectAll<SVGLineElement, GraphLink>("line")
      .attr("stroke", d => {
        const src = typeof d.source === "object" ? (d.source as GraphNode).id : d.source;
        const tgt = typeof d.target === "object" ? (d.target as GraphNode).id : d.target;
        if (!hoveredId) return "hsl(var(--border))";
        return src === hoveredId || tgt === hoveredId ? "hsl(var(--primary))" : "hsl(var(--border))";
      })
      .attr("stroke-opacity", d => {
        if (!hoveredId) return 0.5;
        const src = typeof d.source === "object" ? (d.source as GraphNode).id : d.source;
        const tgt = typeof d.target === "object" ? (d.target as GraphNode).id : d.target;
        return src === hoveredId || tgt === hoveredId ? 1 : 0.1;
      });

    d3.select(svgRef.current).selectAll<SVGCircleElement, GraphNode>("circle")
      .attr("r", d => {
        const base = Math.max(8, Math.min(28, 8 + Math.sqrt(d.connections + 1) * 4));
        return d.id === hoveredId ? base * 1.25 : base;
      });
  }, [hoveredId]);

  const zoomBy = (factor: number) => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).transition().duration(250).call(zoomRef.current.scaleBy, factor);
  };

  const resetView = () => {
    if (!containerRef.current) return;
    const { clientWidth: w, clientHeight: h } = containerRef.current;
    buildGraph(w, h);
  };

  return (
    <div ref={containerRef} className="flex-1 w-full h-full relative overflow-hidden bg-background">
      {/* Controls */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
        <button onClick={() => zoomBy(1.4)}
          className="p-2 bg-card border border-border rounded-lg shadow-sm hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground" title="Zoom in">
          <ZoomIn className="h-4 w-4" />
        </button>
        <button onClick={() => zoomBy(0.7)}
          className="p-2 bg-card border border-border rounded-lg shadow-sm hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground" title="Zoom out">
          <ZoomOut className="h-4 w-4" />
        </button>
        <button onClick={resetView}
          className="p-2 bg-card border border-border rounded-lg shadow-sm hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground" title="Reset">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-card/90 border border-border rounded-xl px-3 py-2 shadow-sm backdrop-blur">
        <p className="text-[10px] font-body text-muted-foreground mb-1">Graph View · {nodeCount} pages</p>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-primary" />
            <span className="text-[10px] font-body text-muted-foreground">High connectivity</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-primary/70" />
            <span className="text-[10px] font-body text-muted-foreground">Connected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-primary/40" />
            <span className="text-[10px] font-body text-muted-foreground">Isolated</span>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-background/80">
          <div className="text-center max-w-xs p-6">
            <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-3" />
            <p className="text-sm font-body font-medium">Graph Error</p>
            <p className="text-xs text-muted-foreground font-body mt-1">{error}</p>
            <button onClick={resetView}
              className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-body">
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Empty */}
      {notes.length === 0 && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Network className="h-10 w-10 text-primary/60" />
            </div>
            <p className="text-sm font-body font-medium text-foreground">No pages to graph</p>
            <p className="text-xs text-muted-foreground font-body mt-1">Create pages and link them with [[wikilinks]]</p>
          </div>
        </div>
      )}

      <svg ref={svgRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
};
