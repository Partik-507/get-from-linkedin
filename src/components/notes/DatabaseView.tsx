import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import type { NoteMetadata } from "@/lib/notesFirestore";

interface Props { notes: NoteMetadata[]; onSelectNote: (id: string) => void; onUpdateProperty: (noteId: string, key: string, value: any) => void; }
type SortField = "title"|"wordCount"|"updatedAt"; type SortDir = "asc"|"desc";

export const DatabaseView = ({ notes, onSelectNote, onUpdateProperty }: Props) => {
  const [sortField, setSortField] = useState<SortField>("updatedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filterTag, setFilterTag] = useState<string|null>(null);

  const allTags = useMemo(()=>{const s=new Set<string>();notes.forEach(n=>n.tags?.forEach(t=>s.add(t)));return[...s].sort();},[notes]);

  const sorted = useMemo(()=>{
    let r=[...notes]; if(filterTag) r=r.filter(n=>n.tags?.includes(filterTag));
    r.sort((a,b)=>{let c=0;if(sortField==="title")c=a.title.localeCompare(b.title);else if(sortField==="wordCount")c=(a.wordCount||0)-(b.wordCount||0);else{c=(a.updatedAt?.toDate?.()?.getTime?.()||0)-(b.updatedAt?.toDate?.()?.getTime?.()||0);}return sortDir==="desc"?-c:c;});
    return r;
  },[notes,sortField,sortDir,filterTag]);

  const toggleSort=(f:SortField)=>{if(sortField===f)setSortDir(d=>d==="asc"?"desc":"asc");else{setSortField(f);setSortDir("asc");}};
  const fmt=(d:any)=>{if(!d)return"—";try{return d.toDate?.()?.toLocaleDateString?.()}catch{return"—"}};

  return (
    <div className="flex-1 overflow-auto p-4">
      {allTags.length>0&&<div className="flex flex-wrap gap-1 mb-3">
        <button onClick={()=>setFilterTag(null)} className={cn("px-2 py-0.5 rounded-full text-[10px] font-body",!filterTag?"bg-primary/15 text-primary":"bg-accent/30 text-muted-foreground/60")}>All</button>
        {allTags.slice(0,10).map(t=><button key={t} onClick={()=>setFilterTag(filterTag===t?null:t)} className={cn("px-2 py-0.5 rounded-full text-[10px] font-body",filterTag===t?"bg-primary/15 text-primary":"bg-accent/30 text-muted-foreground/60")}>{t}</button>)}
      </div>}
      <div className="rounded-xl border border-border/30 overflow-hidden">
        <table className="w-full text-xs font-body">
          <thead><tr className="bg-accent/20">
            <th className="text-left p-2 cursor-pointer" onClick={()=>toggleSort("title")}><span className="flex items-center gap-1">Title {sortField==="title"?(sortDir==="asc"?<ArrowUp className="h-3 w-3 text-primary"/>:<ArrowDown className="h-3 w-3 text-primary"/>):<ArrowUpDown className="h-3 w-3 text-muted-foreground/30"/>}</span></th>
            <th className="text-left p-2">Tags</th>
            <th className="text-left p-2 cursor-pointer" onClick={()=>toggleSort("wordCount")}>Words</th>
            <th className="text-left p-2 cursor-pointer" onClick={()=>toggleSort("updatedAt")}>Modified</th>
            <th className="text-left p-2">Status</th>
          </tr></thead>
          <tbody>{sorted.map(n=><tr key={n.id} className="border-t border-border/20 hover:bg-accent/10">
            <td className="p-2"><button onClick={()=>onSelectNote(n.id)} className="hover:text-primary font-medium">{n.icon?`${n.icon} `:""}{n.title}</button></td>
            <td className="p-2"><div className="flex flex-wrap gap-1">{n.tags?.slice(0,3).map(t=><span key={t} className="px-1.5 rounded-full bg-accent/40 text-[10px]">{t}</span>)}</div></td>
            <td className="p-2 text-muted-foreground">{n.wordCount||0}</td>
            <td className="p-2 text-muted-foreground">{fmt(n.updatedAt)}</td>
            <td className="p-2"><span className={cn("px-1.5 py-0.5 rounded-full text-[10px]",n.isPublic?"bg-green-500/10 text-green-600":"bg-accent/40 text-muted-foreground")}>{n.isPublic?"Public":"Private"}</span></td>
          </tr>)}</tbody>
        </table>
        {sorted.length===0&&<div className="text-center py-8"><p className="text-xs text-muted-foreground/40 font-body">No notes</p></div>}
      </div>
    </div>
  );
};
