import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Plus, ArrowUpDown, Trash2, CheckSquare, Type } from "lucide-react";

interface NoteRef {
  id: string;
  title: string;
  properties: Record<string, any>;
}

interface Column {
  name: string;
  type: "text" | "checkbox";
}

interface Props {
  notes: NoteRef[];
  onUpdateProperty: (noteId: string, key: string, value: any) => void;
  onSelectNote: (id: string) => void;
}

export const DatabaseView = ({ notes, onUpdateProperty, onSelectNote }: Props) => {
  const [columns, setColumns] = useState<Column[]>([
    { name: "Status", type: "checkbox" },
    { name: "Category", type: "text" },
  ]);
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [newColName, setNewColName] = useState("");

  const addColumn = () => {
    if (!newColName.trim()) return;
    setColumns(prev => [...prev, { name: newColName.trim(), type: "text" }]);
    setNewColName("");
  };

  const removeColumn = (name: string) => {
    setColumns(prev => prev.filter(c => c.name !== name));
  };

  const toggleSort = (col: string) => {
    if (sortBy === col) setSortAsc(!sortAsc);
    else { setSortBy(col); setSortAsc(true); }
  };

  const sorted = [...notes].sort((a, b) => {
    if (!sortBy) return 0;
    if (sortBy === "title") {
      return sortAsc ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title);
    }
    const aVal = a.properties?.[sortBy] ?? "";
    const bVal = b.properties?.[sortBy] ?? "";
    if (typeof aVal === "boolean") return sortAsc ? (aVal ? -1 : 1) : (aVal ? 1 : -1);
    return sortAsc ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
  });

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="border border-border/60 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-accent/30 border-b border-border/40">
              <th
                className="text-left px-3 py-2 text-xs font-body font-semibold text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                onClick={() => toggleSort("title")}
              >
                <span className="flex items-center gap-1">
                  Title <ArrowUpDown className="h-3 w-3" />
                </span>
              </th>
              {columns.map(col => (
                <th
                  key={col.name}
                  className="text-left px-3 py-2 text-xs font-body font-semibold text-muted-foreground group"
                >
                  <span className="flex items-center gap-1">
                    <button onClick={() => toggleSort(col.name)} className="flex items-center gap-1 hover:text-foreground transition-colors">
                      {col.type === "checkbox" ? <CheckSquare className="h-3 w-3" /> : <Type className="h-3 w-3" />}
                      {col.name}
                      <ArrowUpDown className="h-2.5 w-2.5" />
                    </button>
                    <button
                      onClick={() => removeColumn(col.name)}
                      className="opacity-0 group-hover:opacity-100 text-destructive ml-auto"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                </th>
              ))}
              <th className="px-2 py-2 w-32">
                <div className="flex items-center gap-1">
                  <Input
                    value={newColName}
                    onChange={e => setNewColName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addColumn()}
                    placeholder="+ Column"
                    className="h-6 text-[10px] bg-transparent border-dashed"
                  />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(note => (
              <tr key={note.id} className="border-b border-border/20 hover:bg-accent/20 transition-colors">
                <td className="px-3 py-2">
                  <button
                    onClick={() => onSelectNote(note.id)}
                    className="text-xs font-body text-primary hover:underline truncate max-w-[200px] block"
                  >
                    {note.title || "Untitled"}
                  </button>
                </td>
                {columns.map(col => (
                  <td key={col.name} className="px-3 py-2">
                    {col.type === "checkbox" ? (
                      <input
                        type="checkbox"
                        checked={!!note.properties?.[col.name]}
                        onChange={e => onUpdateProperty(note.id, col.name, e.target.checked)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                    ) : (
                      <input
                        type="text"
                        value={note.properties?.[col.name] || ""}
                        onChange={e => onUpdateProperty(note.id, col.name, e.target.value)}
                        className="text-xs font-body bg-transparent outline-none w-full border-b border-transparent focus:border-primary/30 transition-colors"
                        placeholder="—"
                      />
                    )}
                  </td>
                ))}
                <td />
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={columns.length + 2} className="text-center py-6 text-sm text-muted-foreground font-body">
                  No notes to display
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
