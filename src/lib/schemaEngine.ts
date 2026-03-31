/**
 * Schema Detection, Normalization, Deduplication & Index Engine
 * Fully dynamic — no hardcoded keys. Analyzes any JSON structure.
 */

// ─── Types ───
export interface DetectedField {
  key: string;
  path: string;
  type: "string" | "number" | "boolean" | "date" | "array" | "object" | "mixed";
  sampleValues: string[];
  uniqueCount: number;
  isMultiValue: boolean;
  isNested: boolean;
  nullCount: number;
  totalCount: number;
}

export type FieldRole =
  | "primary_id"
  | "display_title"
  | "question"
  | "answer"
  | "description"
  | "grouping"
  | "filterable"
  | "searchable"
  | "sortable"
  | "metadata"
  | "skip";

export type FilterType =
  | "dropdown"
  | "multi_select"
  | "range"
  | "date_picker"
  | "hierarchical";

export interface FieldMapping {
  sourceKey: string;
  targetKey: string;
  role: FieldRole;
  filterType?: FilterType;
  isMultiSelect?: boolean;
  isHierarchical?: boolean;
  isRange?: boolean;
}

export interface SchemaTemplate {
  id?: string;
  name: string;
  fieldMappings: FieldMapping[];
  createdAt?: any;
  createdBy?: string;
}

export interface FilterIndex {
  fieldKey: string;
  fieldLabel: string;
  filterType: FilterType;
  values: { value: string; count: number }[];
  updatedAt?: any;
}

export interface ImportLog {
  id?: string;
  fileHash: string;
  projectId: string;
  recordCount: number;
  duplicatesSkipped: number;
  mergedCount: number;
  invalidCount: number;
  schemaTemplateId?: string;
  importedBy: string;
  importedAt?: any;
}

export interface DeduplicationResult {
  clean: Record<string, any>[];
  duplicates: Record<string, any>[];
  merged: Record<string, any>[];
  invalid: Record<string, any>[];
}

// ─── Helpers ───

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})/;

function inferType(value: any): DetectedField["type"] {
  if (value === null || value === undefined) return "string";
  if (Array.isArray(value)) return "array";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number" || (typeof value === "string" && value !== "" && !isNaN(Number(value)) && value.trim() === value)) return "number";
  if (typeof value === "string" && ISO_DATE_RE.test(value)) return "date";
  if (typeof value === "object") return "object";
  return "string";
}

function flattenKeys(obj: Record<string, any>, prefix = ""): [string, any][] {
  const entries: [string, any][] = [];
  for (const [key, val] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (val && typeof val === "object" && !Array.isArray(val)) {
      entries.push(...flattenKeys(val, path));
    } else {
      entries.push([path, val]);
    }
  }
  return entries;
}

// ─── Schema Detection ───

export function detectSchema(records: Record<string, any>[]): DetectedField[] {
  if (!records.length) return [];

  const fieldMap = new Map<string, {
    types: Map<string, number>;
    samples: Set<string>;
    nulls: number;
    total: number;
    isArray: boolean;
    isNested: boolean;
  }>();

  for (const record of records) {
    const flat = flattenKeys(record);
    for (const [path, value] of flat) {
      if (!fieldMap.has(path)) {
        fieldMap.set(path, { types: new Map(), samples: new Set(), nulls: 0, total: 0, isArray: false, isNested: path.includes(".") });
      }
      const f = fieldMap.get(path)!;
      f.total++;

      if (value === null || value === undefined || value === "") {
        f.nulls++;
        continue;
      }

      const t = inferType(value);
      f.types.set(t, (f.types.get(t) || 0) + 1);

      if (Array.isArray(value)) {
        f.isArray = true;
        value.slice(0, 3).forEach((v: any) => {
          if (f.samples.size < 5) f.samples.add(String(v));
        });
      } else {
        if (f.samples.size < 5) f.samples.add(String(value));
      }
    }
  }

  const fields: DetectedField[] = [];
  for (const [path, info] of fieldMap) {
    let majorType: DetectedField["type"] = "string";
    let maxCount = 0;
    for (const [t, c] of info.types) {
      if (c > maxCount) { maxCount = c; majorType = t as any; }
    }
    if (info.types.size > 1) majorType = "mixed";
    if (info.isArray) majorType = "array";

    fields.push({
      key: path.includes(".") ? path.split(".").pop()! : path,
      path,
      type: majorType,
      sampleValues: Array.from(info.samples).slice(0, 5),
      uniqueCount: info.samples.size,
      isMultiValue: info.isArray,
      isNested: info.isNested,
      nullCount: info.nulls,
      totalCount: info.total,
    });
  }

  return fields.sort((a, b) => b.totalCount - a.totalCount);
}

// ─── Auto-suggest mappings ───

const ROLE_HINTS: Record<string, { role: FieldRole; target: string }> = {
  question: { role: "question", target: "question" },
  q: { role: "question", target: "question" },
  text: { role: "question", target: "question" },
  answer: { role: "answer", target: "answer" },
  a: { role: "answer", target: "answer" },
  content: { role: "answer", target: "answer" },
  category: { role: "filterable", target: "category" },
  cat: { role: "filterable", target: "category" },
  frequency: { role: "filterable", target: "frequency" },
  difficulty: { role: "filterable", target: "frequency" },
  freq: { role: "filterable", target: "frequency" },
  proctors: { role: "filterable", target: "proctors" },
  asked_by: { role: "filterable", target: "proctors" },
  proctor: { role: "filterable", target: "proctors" },
  tags: { role: "filterable", target: "tags" },
  tag: { role: "filterable", target: "tags" },
  tip: { role: "metadata", target: "tip" },
  projecttip: { role: "metadata", target: "projectTip" },
  codeexample: { role: "metadata", target: "codeExample" },
  code: { role: "metadata", target: "codeExample" },
  codelanguage: { role: "metadata", target: "codeLanguage" },
  lang: { role: "metadata", target: "codeLanguage" },
  questionid: { role: "primary_id", target: "questionId" },
  id: { role: "primary_id", target: "questionId" },
  title: { role: "display_title", target: "title" },
  name: { role: "display_title", target: "title" },
  description: { role: "description", target: "description" },
  source: { role: "metadata", target: "source" },
  projectid: { role: "grouping", target: "projectId" },
  project_id: { role: "grouping", target: "projectId" },
  course_id: { role: "grouping", target: "courseId" },
  courseid: { role: "grouping", target: "courseId" },
};

export function autoSuggestMappings(fields: DetectedField[]): FieldMapping[] {
  return fields.map((f) => {
    const normalized = f.key.toLowerCase().replace(/[_\- ]/g, "");
    const hint = ROLE_HINTS[normalized];
    
    const filterType: FilterType = f.isMultiValue ? "multi_select" 
      : f.type === "number" ? "range"
      : f.type === "date" ? "date_picker"
      : "dropdown";

    if (hint) {
      return {
        sourceKey: f.path,
        targetKey: hint.target,
        role: hint.role,
        filterType: hint.role === "filterable" ? filterType : undefined,
        isMultiSelect: f.isMultiValue,
      };
    }

    return {
      sourceKey: f.path,
      targetKey: f.key,
      role: "metadata" as FieldRole,
      filterType: undefined,
    };
  });
}

// ─── Normalization ───

function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((acc, key) => acc?.[key], obj);
}

export function normalizeRecords(
  records: Record<string, any>[],
  mappings: FieldMapping[]
): Record<string, any>[] {
  return records.map((record) => {
    const normalized: Record<string, any> = { _raw: { ...record } };

    for (const mapping of mappings) {
      if (mapping.role === "skip") continue;
      
      let value = getNestedValue(record, mapping.sourceKey);

      // Type coercion
      if (value !== undefined && value !== null) {
        if (mapping.isMultiSelect && !Array.isArray(value)) {
          // Convert comma-separated strings to arrays
          if (typeof value === "string" && value.includes(",")) {
            value = value.split(",").map((v: string) => v.trim()).filter(Boolean);
          } else {
            value = [value];
          }
        }
        if (typeof value === "string" && !isNaN(Number(value)) && value.trim() !== "") {
          // Keep as string unless explicitly numeric field
        }
      }

      normalized[mapping.targetKey] = value ?? "";
    }

    return normalized;
  });
}

// ─── Deduplication ───

function normalizeText(text: string): string {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export function generateFingerprint(record: Record<string, any>, primaryFields: string[]): string {
  const parts = primaryFields.map((f) => normalizeText(String(record[f] || "")));
  return simpleHash(parts.join("|||"));
}

export function generateFileHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) - hash) + content.charCodeAt(i);
    hash |= 0;
  }
  return "fh_" + Math.abs(hash).toString(36) + "_" + content.length;
}

export function deduplicateRecords(
  records: Record<string, any>[],
  primaryFields: string[],
  existingHashes?: Set<string>,
  mergeFields?: string[]
): DeduplicationResult {
  const clean: Record<string, any>[] = [];
  const duplicates: Record<string, any>[] = [];
  const merged: Record<string, any>[] = [];
  const invalid: Record<string, any>[] = [];
  const seenHashes = new Map<string, number>();

  for (const record of records) {
    // Validate — must have at least one primary field with content
    const hasContent = primaryFields.some((f) => {
      const val = record[f];
      return val && String(val).trim().length > 0;
    });

    if (!hasContent) {
      invalid.push(record);
      continue;
    }

    const hash = generateFingerprint(record, primaryFields);

    // Check against existing DB hashes
    if (existingHashes?.has(hash)) {
      duplicates.push(record);
      continue;
    }

    // Check within current batch
    if (seenHashes.has(hash)) {
      const idx = seenHashes.get(hash)!;
      const existing = clean[idx];

      // Merge multi-value fields
      if (mergeFields) {
        for (const field of mergeFields) {
          const existingVal = Array.isArray(existing[field]) ? existing[field] : existing[field] ? [existing[field]] : [];
          const newVal = Array.isArray(record[field]) ? record[field] : record[field] ? [record[field]] : [];
          const combinedSet = new Set([...existingVal, ...newVal]);
          existing[field] = Array.from(combinedSet);
        }
      }
      
      merged.push(record);
      continue;
    }

    seenHashes.set(hash, clean.length);
    clean.push(record);
  }

  return { clean, duplicates, merged, invalid };
}

// ─── Filter Index Generation ───

export function generateFilterIndexes(
  records: Record<string, any>[],
  mappings: FieldMapping[]
): FilterIndex[] {
  const filterMappings = mappings.filter((m) => m.role === "filterable");
  const indexes: FilterIndex[] = [];

  for (const mapping of filterMappings) {
    const valueCounts = new Map<string, number>();

    for (const record of records) {
      const val = record[mapping.targetKey];
      if (val === null || val === undefined || val === "") continue;

      if (Array.isArray(val)) {
        for (const v of val) {
          const s = String(v).trim();
          if (s) valueCounts.set(s, (valueCounts.get(s) || 0) + 1);
        }
      } else {
        const s = String(val).trim();
        if (s) valueCounts.set(s, (valueCounts.get(s) || 0) + 1);
      }
    }

    const values = Array.from(valueCounts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);

    if (values.length > 0) {
      indexes.push({
        fieldKey: mapping.targetKey,
        fieldLabel: mapping.targetKey.charAt(0).toUpperCase() + mapping.targetKey.slice(1).replace(/([A-Z])/g, " $1"),
        filterType: mapping.filterType || "dropdown",
        values,
      });
    }
  }

  return indexes;
}

// ─── Batch Chunker ───

export function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
