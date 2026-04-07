import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { BookOpen, FileText, Calendar, Lightbulb, Network, Sparkles } from "lucide-react";

const TEMPLATES = [
  { id:"blank",title:"Blank Page",description:"Start from scratch",icon:FileText,color:"text-muted-foreground",content:"",tags:[] },
  { id:"study",title:"Study Notes",description:"Structured study template",icon:BookOpen,color:"text-primary",
    content:`<h1>📚 Topic Name</h1><h2>Overview</h2><p>Brief overview...</p><h2>Key Concepts</h2><ul><li>Concept 1</li><li>Concept 2</li></ul><h2>Important Formulas</h2><p><code>Formula</code></p><h2>Practice Questions</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false">Q1</li></ul><h2>Summary</h2><p>Key takeaways...</p>`,tags:["study"] },
  { id:"project",title:"Project Report",description:"Academic project",icon:Sparkles,color:"text-purple-500",
    content:`<h1>🎯 Project Title</h1><h2>Objective</h2><p></p><h2>Methodology</h2><p></p><h2>Results</h2><p></p><h2>Conclusion</h2><p></p>`,tags:["project"] },
  { id:"meeting",title:"Meeting Notes",description:"Agenda & action items",icon:Calendar,color:"text-blue-500",
    content:`<h1>📋 Meeting Notes</h1><p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p><h2>Agenda</h2><ul><li>Topic 1</li></ul><h2>Action Items</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false">Action 1</li></ul>`,tags:["meeting"] },
  { id:"journal",title:"Daily Journal",description:"Daily reflection",icon:Lightbulb,color:"text-amber-500",
    content:`<h1>📝 ${new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</h1><h2>🎯 Goals</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false">Goal 1</li></ul><h2>💭 Thoughts</h2><p></p>`,tags:["journal"] },
  { id:"concept",title:"Concept Map",description:"Connected concepts",icon:Network,color:"text-green-500",
    content:`<h1>🧠 Main Concept</h1><blockquote><p>💡 Core Idea: ...</p></blockquote><h2>Sub-Concepts</h2><h3>A</h3><p>...</p><h3>B</h3><p>...</p>`,tags:["concept-map"] },
];

interface Props { open: boolean; onClose: () => void; onSelect: (t: { title: string; content: string; tags: string[] }) => void; }

export const TemplatePickerModal = ({ open, onClose, onSelect }: Props) => {
  const [hovered, setHovered] = useState<string|null>(null);
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle className="font-heading">Choose a Template</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 mt-2">
          {TEMPLATES.map(t=>(
            <button key={t.id} onClick={()=>{onSelect({title:t.id==="blank"?"Untitled":t.title,content:t.content,tags:t.tags});onClose();}}
              onMouseEnter={()=>setHovered(t.id)} onMouseLeave={()=>setHovered(null)}
              className={cn("flex items-start gap-3 p-4 rounded-xl border text-left transition-all",hovered===t.id?"border-primary/40 bg-primary/5":"border-border/30 hover:border-border/60")}>
              <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-accent/30",t.color)}><t.icon className="h-4 w-4"/></div>
              <div><p className="text-sm font-body font-medium">{t.title}</p><p className="text-[10px] text-muted-foreground/60 font-body mt-0.5">{t.description}</p></div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
