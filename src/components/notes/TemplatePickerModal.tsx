import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { FileText, BookOpen, Calendar, Target, Lightbulb } from "lucide-react";

interface NoteTemplate {
  id: string;
  title: string;
  icon: React.ElementType;
  content: string;
  tags: string[];
}

const TEMPLATES: NoteTemplate[] = [
  {
    id: "meeting",
    title: "Meeting Notes",
    icon: Calendar,
    tags: ["meeting"],
    content: `<h2>Meeting Notes</h2><p><strong>Date:</strong> </p><p><strong>Attendees:</strong> </p><h3>Agenda</h3><ul><li></li></ul><h3>Discussion</h3><p></p><h3>Action Items</h3><ul class="task-list"><li data-type="taskItem" data-checked="false">Task 1</li></ul>`,
  },
  {
    id: "study",
    title: "Study Notes",
    icon: BookOpen,
    tags: ["study"],
    content: `<h2>Study Notes</h2><h3>Topic</h3><p></p><h3>Key Concepts</h3><ul><li></li></ul><h3>Questions</h3><ol><li></li></ol><h3>Summary</h3><p></p>`,
  },
  {
    id: "project",
    title: "Project Plan",
    icon: Target,
    tags: ["project"],
    content: `<h2>Project Plan</h2><h3>Objective</h3><p></p><h3>Milestones</h3><ul class="task-list"><li data-type="taskItem" data-checked="false">Milestone 1</li><li data-type="taskItem" data-checked="false">Milestone 2</li></ul><h3>Resources</h3><ul><li></li></ul><h3>Timeline</h3><p></p>`,
  },
  {
    id: "journal",
    title: "Daily Journal",
    icon: FileText,
    tags: ["journal"],
    content: `<h2>Daily Journal</h2><p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p><h3>Today's Goals</h3><ul class="task-list"><li data-type="taskItem" data-checked="false">Goal 1</li></ul><h3>Reflections</h3><p></p><h3>Tomorrow's Plan</h3><p></p>`,
  },
  {
    id: "reading",
    title: "Reading Notes",
    icon: Lightbulb,
    tags: ["reading"],
    content: `<h2>Reading Notes</h2><p><strong>Source:</strong> </p><p><strong>Author:</strong> </p><h3>Key Ideas</h3><ul><li></li></ul><h3>Quotes</h3><blockquote><p></p></blockquote><h3>My Thoughts</h3><p></p>`,
  },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: { title: string; content: string; tags: string[] }) => void;
}

export const TemplatePickerModal = ({ open, onOpenChange, onSelect }: Props) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">New from Template</DialogTitle>
          <DialogDescription className="font-body">Choose a template to get started</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 mt-2">
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => {
                onSelect({ title: t.title, content: t.content, tags: t.tags });
                onOpenChange(false);
              }}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/60 hover:border-primary/40 hover:bg-accent/30 transition-all group text-center"
            >
              <t.icon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-sm font-body font-medium">{t.title}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
