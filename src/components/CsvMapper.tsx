import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";

interface CsvMapperProps {
  headers: string[];
  rows: string[][];
  onMap: (mappedData: Record<string, any>[]) => void;
  onCancel: () => void;
}

const QUESTION_FIELDS = [
  { value: "skip", label: "— Skip —" },
  { value: "question", label: "Question" },
  { value: "answer", label: "Answer" },
  { value: "category", label: "Category" },
  { value: "frequency", label: "Difficulty" },
  { value: "tip", label: "Tip" },
  { value: "projectTip", label: "Project Tip" },
  { value: "codeExample", label: "Code Example" },
  { value: "codeLanguage", label: "Code Language" },
  { value: "tags", label: "Tags (comma-separated)" },
  { value: "source", label: "Source" },
  { value: "custom", label: "Custom Field" },
];

export const CsvMapper = ({ headers, rows, onMap, onCancel }: CsvMapperProps) => {
  const [mapping, setMapping] = useState<Record<number, string>>(() => {
    // Auto-map based on header names
    const autoMap: Record<number, string> = {};
    headers.forEach((h, i) => {
      const lower = h.toLowerCase().trim();
      if (lower.includes("question") || lower === "q") autoMap[i] = "question";
      else if (lower.includes("answer") || lower === "a") autoMap[i] = "answer";
      else if (lower.includes("category") || lower === "cat") autoMap[i] = "category";
      else if (lower.includes("difficulty") || lower.includes("frequency")) autoMap[i] = "frequency";
      else if (lower.includes("tip")) autoMap[i] = "tip";
      else if (lower.includes("tag")) autoMap[i] = "tags";
      else autoMap[i] = "skip";
    });
    return autoMap;
  });

  const previewRows = rows.slice(0, 5);

  const handleConfirm = () => {
    const mapped = rows.map((row) => {
      const obj: Record<string, any> = {};
      const customFields: Record<string, string> = {};

      headers.forEach((header, i) => {
        const field = mapping[i];
        if (!field || field === "skip") return;
        const val = row[i] || "";

        if (field === "custom") {
          customFields[header] = val;
        } else if (field === "tags") {
          obj.tags = val.split(",").map((t: string) => t.trim()).filter(Boolean);
        } else {
          obj[field] = val;
        }
      });

      if (Object.keys(customFields).length > 0) {
        obj.customFields = customFields;
      }
      return obj;
    });

    onMap(mapped.filter((m) => m.question));
  };

  const hasQuestion = Object.values(mapping).includes("question");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-semibold">Map CSV Columns</h3>
        <Badge variant="outline" className="font-body">{rows.length} rows</Badge>
      </div>

      <p className="text-sm text-muted-foreground font-body">
        Map each CSV column to a question field. At minimum, map a "Question" column.
      </p>

      {/* Column mapping */}
      <div className="space-y-2">
        {headers.map((header, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-sm font-body text-muted-foreground w-40 truncate shrink-0">
              {header}
            </span>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={mapping[i] || "skip"} onValueChange={(v) => setMapping((m) => ({ ...m, [i]: v }))}>
              <SelectTrigger className="w-48 bg-secondary/30 border-border/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUESTION_FIELDS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      {/* Preview */}
      {previewRows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border/30">
          <Table>
            <TableHeader>
              <TableRow>
                {headers.map((h, i) => (
                  <TableHead key={i} className="text-xs">
                    {mapping[i] !== "skip" ? (
                      <Badge variant="default" className="text-[10px]">{mapping[i]}</Badge>
                    ) : (
                      <span className="text-muted-foreground">{h}</span>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewRows.map((row, ri) => (
                <TableRow key={ri}>
                  {row.map((cell, ci) => (
                    <TableCell key={ci} className="text-xs max-w-[200px] truncate">
                      {cell}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onCancel} className="font-body">Cancel</Button>
        <Button onClick={handleConfirm} disabled={!hasQuestion} className="font-body">
          Map & Preview ({rows.length} rows)
        </Button>
      </div>
    </div>
  );
};
