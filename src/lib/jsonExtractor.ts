/**
 * Universal JSON Extraction Engine
 * Scans any raw text (code, markup, prose) and extracts all valid JSON objects/arrays.
 * No AI APIs — pure regex + recursive JSON.parse.
 */

interface ExtractionResult {
  items: Record<string, any>[];
  errors: string[];
}

/**
 * Find matching bracket position
 */
const findMatchingBracket = (text: string, start: number): number => {
  const open = text[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (ch === "\\") {
      escape = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return i;
    }
  }

  return -1;
};

/**
 * Extract all JSON candidates from raw text
 */
const findJsonCandidates = (text: string): string[] => {
  const candidates: string[] = [];
  
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "{" || text[i] === "[") {
      const end = findMatchingBracket(text, i);
      if (end > i) {
        const candidate = text.substring(i, end + 1);
        if (candidate.length > 2) {
          candidates.push(candidate);
        }
      }
    }
  }

  return candidates;
};

/**
 * Try to parse a string as JSON, with cleanup for common issues
 */
const tryParse = (text: string): any | null => {
  try {
    return JSON.parse(text);
  } catch {
    // Try cleaning common issues
    try {
      // Remove trailing commas
      const cleaned = text.replace(/,\s*([}\]])/g, "$1");
      return JSON.parse(cleaned);
    } catch {
      // Try wrapping in array if it looks like multiple objects
      try {
        const wrapped = "[" + text.replace(/}\s*{/g, "},{") + "]";
        return JSON.parse(wrapped);
      } catch {
        return null;
      }
    }
  }
};

/**
 * Flatten nested structures to extract question-like objects
 */
const flattenToObjects = (data: any): Record<string, any>[] => {
  if (Array.isArray(data)) {
    const results: Record<string, any>[] = [];
    for (const item of data) {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        results.push(item);
      } else if (Array.isArray(item)) {
        results.push(...flattenToObjects(item));
      }
    }
    return results;
  }

  if (data && typeof data === "object") {
    // Check if this object itself looks like a question
    const keys = Object.keys(data);
    const questionLikeKeys = ["question", "q", "answer", "a", "text", "title", "content"];
    if (keys.some((k) => questionLikeKeys.includes(k.toLowerCase()))) {
      return [data];
    }

    // Check nested arrays
    for (const key of keys) {
      const val = data[key];
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === "object") {
        return flattenToObjects(val);
      }
    }

    // If object has string values, treat it as a single item
    if (keys.length > 0) {
      return [data];
    }
  }

  return [];
};

/**
 * Main extraction function — accepts ANY text and returns extracted question objects
 */
export const extractJsonFromText = (rawText: string): ExtractionResult => {
  const errors: string[] = [];
  const allItems: Record<string, any>[] = [];
  const seen = new Set<string>();

  // First, try parsing the entire text as JSON
  const fullParse = tryParse(rawText.trim());
  if (fullParse) {
    const items = flattenToObjects(fullParse);
    if (items.length > 0) {
      return { items, errors };
    }
  }

  // Find JSON candidates in the text
  const candidates = findJsonCandidates(rawText);

  // Sort by length descending — prefer larger (more complete) JSON blocks
  candidates.sort((a, b) => b.length - a.length);

  for (const candidate of candidates) {
    const parsed = tryParse(candidate);
    if (!parsed) continue;

    const items = flattenToObjects(parsed);
    for (const item of items) {
      const sig = JSON.stringify(item);
      if (!seen.has(sig)) {
        seen.add(sig);
        allItems.push(item);
      }
    }

    // If we found items from the largest candidate, don't look at sub-candidates
    if (allItems.length > 0 && candidate === candidates[0]) break;
  }

  if (allItems.length === 0) {
    errors.push("No valid JSON objects found in the provided text.");
  }

  return { items: allItems, errors };
};

/**
 * Map extracted items to our question schema
 */
export const mapToQuestionSchema = (items: Record<string, any>[]): Record<string, any>[] => {
  const KNOWN_KEYS = new Set([
    "question", "q", "answer", "a", "category", "cat", "frequency", "freq",
    "difficulty", "tip", "interviewTip", "projectTip", "codeExample", "code",
    "codeLanguage", "lang", "proctors", "upvotes", "followUps", "projectId",
    "tags", "subCategory", "relatedIds", "source", "choices", "questionId",
    "tips",
  ]);

  return items.map((item, index) => {
    const customFields: Record<string, string> = {};
    Object.keys(item).forEach((k) => {
      if (!KNOWN_KEYS.has(k) && typeof item[k] !== "object") {
        customFields[k] = String(item[k]);
      }
    });

    return {
      questionId: item.questionId || `auto-${Date.now()}-${index}`,
      question: String(item.question || item.q || item.text || item.title || ""),
      answer: String(item.answer || item.a || item.content || ""),
      category: String(item.category || item.cat || "General"),
      frequency: String(item.frequency || item.freq || item.difficulty || "medium").toLowerCase(),
      tip: String(item.tip || item.interviewTip || ""),
      tips: Array.isArray(item.tips) ? item.tips.map(String) : [],
      projectTip: String(item.projectTip || ""),
      codeExample: String(item.codeExample || item.code || ""),
      codeLanguage: String(item.codeLanguage || item.lang || ""),
      proctors: Array.isArray(item.proctors) ? item.proctors.map(String) : [],
      tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
      subCategory: String(item.subCategory || ""),
      relatedIds: Array.isArray(item.relatedIds) ? item.relatedIds : [],
      source: String(item.source || ""),
      choices: Array.isArray(item.choices) ? item.choices : undefined,
      followUps: Array.isArray(item.followUps) ? item.followUps : [],
      customFields,
      _raw: item, // Keep original for preview editing
    };
  });
};
