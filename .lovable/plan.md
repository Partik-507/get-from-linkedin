

# VivaVault — Dynamic Schema-Driven Data Ingestion & Admin OS Plan

## Summary

Build a fully dynamic, schema-less data ingestion pipeline and expand the admin panel into a complete Admin OS. The system will analyze any uploaded JSON, let admin map fields interactively, normalize/deduplicate data, and only write to Firestore after explicit confirmation. Frontend filters will be generated dynamically from stored schema configs — no hardcoded keys.

---

## Architecture Overview

```text
JSON Upload/Paste
       ↓
  In-Memory Parse (jsonExtractor.ts — already exists)
       ↓
  Schema Detection Engine (NEW)
  → scan all records, extract unique keys, infer types
       ↓
  Admin Mapping UI (NEW)
  → assign roles: primary ID, question, answer, grouping, filters, search, sort
  → mark filter types: dropdown, multi-select, range, date, hierarchical
  → save as reusable schema template to Firestore /schema_templates/{id}
       ↓
  Normalization Layer (enhance jsonExtractor.ts)
  → standardize keys per mapping, flatten nested, coerce types
  → preserve raw data in _raw field
       ↓
  Deduplication Engine (NEW)
  → normalized hash of primary content fields
  → detect dupes across dataset AND existing DB records
  → merge multi-value fields (proctors, tags)
  → produce clean dataset + dedup report
       ↓
  Preview & Validation (in-memory only)
  → show counts: new / duplicate / invalid / total
  → admin reviews before any DB write
       ↓
  Batched Atomic Write (on confirm)
  → Firestore batch writes (max 500 per batch)
  → store normalized records in /questions
  → generate & store filter indexes in /filter_indexes/{projectId}
  → record import metadata in /import_logs/{id} (file hash, counts, schema used)
  → file hash check prevents re-import of same dataset
       ↓
  Dynamic Frontend Rendering
  → VivaPrep.tsx fetches /filter_indexes/{projectId} + /schema_templates
  → renders filters dynamically: dropdowns, chips, ranges, dates
  → no hardcoded filter keys
```

---

## Phase 1: Schema Detection Engine

**New file**: `src/lib/schemaEngine.ts`

- `detectSchema(records: any[])` → scans all records, returns:
  - `fields`: array of `{ key, path (for nested), type (string|number|boolean|date|array|object), sampleValues (first 5 unique), uniqueCount, isMultiValue, isNested }`
- Handles nested keys by flattening with dot notation (e.g., `meta.proctor`)
- Type inference: check all records, pick majority type, flag inconsistencies
- Detect arrays vs single values, dates (ISO string patterns), booleans

## Phase 2: Schema Mapping UI

**New admin section**: "Schema & Import" in Admin sidebar

### Mapping Interface:
- After JSON parse, show a table of all detected fields
- Each field row has:
  - Field name (from JSON)
  - Detected type (auto)
  - Sample values (3-5 shown)
  - **Role dropdown**: Primary ID, Display Title, Question, Answer, Description, Grouping Key, Filterable, Searchable, Sortable, Metadata, Skip
  - **Filter type** (when Filterable): Dropdown, Multi-Select Chips, Range Slider, Date Picker, Hierarchical
  - **Rename to** (optional): e.g., `asked_by` → `proctor`
- Auto-suggest mappings based on key names (reuse existing logic from `mapToQuestionSchema`)
- "Save as Template" button → stores config in `/schema_templates/{id}` with: name, fieldMappings[], createdAt, createdBy
- "Load Template" dropdown → auto-applies saved mapping to new import

### Firestore schema for templates:
```
/schema_templates/{id}
  - name: string
  - fieldMappings: [{ sourceKey, targetKey, role, filterType, isMultiSelect, isHierarchical, isRange }]
  - createdAt, createdBy
```

## Phase 3: Normalization & Deduplication

**Enhance**: `src/lib/jsonExtractor.ts`

### Normalization:
- New function `normalizeRecords(records, mapping)`:
  - Renames fields per mapping config
  - Flattens nested structures
  - Coerces types (string numbers → numbers, comma-strings → arrays)
  - Standardizes to internal schema while keeping `_raw` for traceability

### Deduplication:
- New function `deduplicateRecords(records, existingHashes?, primaryFields?)`:
  - Generate fingerprint: lowercase + trim + remove punctuation of primary content fields → MD5-like hash (use simple string hash)
  - Compare against provided existing hashes (fetched from DB before import)
  - When duplicate found: merge multi-value fields (proctors, tags) into arrays
  - Return: `{ clean: Record[], duplicates: Record[], merged: Record[], invalid: Record[] }`

## Phase 4: Filter Index Generation

**New Firestore collection**: `/filter_indexes/{projectId}`

- After import, for each field marked as "Filterable" in the mapping:
  - Extract all unique values across records
  - Count occurrences
  - Store as: `{ fieldKey, fieldLabel, filterType, values: [{ value, count }], updatedAt }`
- On subsequent imports, merge new values into existing index
- Function: `generateFilterIndexes(records, mapping, projectId)` → writes to Firestore

## Phase 5: Import Metadata & Duplicate Prevention

**New collection**: `/import_logs/{id}`
- Fields: fileHash (SHA-256 of raw content), projectId, recordCount, duplicatesSkipped, mergedCount, invalidCount, schemaTemplateId, importedBy, importedAt
- Before import: check if fileHash already exists → warn admin "This exact file was already imported on [date]"

## Phase 6: Dynamic Filter Rendering (VivaPrep.tsx)

**Major change to** `src/pages/VivaPrep.tsx`:

- On mount, fetch `/filter_indexes/{projectId}` alongside questions
- Replace hardcoded Category/Proctor/Tags dropdowns with dynamic rendering:
  - For each filter index entry, render the appropriate UI control based on `filterType`:
    - `dropdown` → `<Select>` with unique values
    - `multi-select` → chip/pill toggles
    - `range` → slider (for numeric fields)
    - `date` → date picker
    - `hierarchical` → nested tree select
  - All filter state stored in a generic `Record<string, string | string[]>` object
  - Filtering logic uses a generic combiner: for each active filter, check if record's field matches
- Keep frequency pills as quick toggles (they're UX, not schema-driven)
- Preserve existing bookmark, edit, share, upvote functionality untouched

## Phase 7: Admin Panel Expansion

**Expand** `src/pages/Admin.tsx` sidebar with new sections:

| Section | Purpose |
|---------|---------|
| Overview | Stats dashboard: total users, courses, questions, pending items |
| Branches & Levels | Full CRUD (already partially built in firestoreSync) |
| Courses & Projects | Enhanced CRUD: add accessType, branchId, levelId, iconColor, status, unlockConditions |
| Schema & Import | The new mapping UI + import pipeline |
| Questions | Existing import (now using schema engine) |
| Notes Management | Existing + enhanced |
| Resources | Existing |
| Notifications | Compose & send (already in firestoreSync) |
| Submissions | Existing approval workflows |
| Access Requests | List/approve locked course requests |
| Admin Management | Existing |
| Audit Log | New: view all admin actions with timestamps |

### Audit Logging:
- New helper: `logAdminAction(uid, action, entityType, entityId, details)`
- Writes to `/audit_logs/{id}`: userId, action (create/update/delete/import), entityType, entityId, details, timestamp
- Admin can view audit log in a dedicated section

## Phase 8: Full CRUD for All Entities

Expand `firestoreSync.ts` with complete CRUD for:
- Courses/Projects: create, update, delete with full metadata (accessType, branchId, levelId, status, iconColor, unlockConditions)
- Questions: individual CRUD (not just bulk import)
- Resources: CRUD + approval status
- Flashcards: deck CRUD
- Quizzes: CRUD
- Notifications: compose, list, delete
- Users: list, update role, delete

Each write operation calls `logAdminAction()` for audit trail.

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/schemaEngine.ts` | Schema detection, normalization, deduplication, index generation |

## Files to Heavily Modify

| File | Changes |
|------|---------|
| `src/pages/Admin.tsx` | Add Schema & Import section with mapping UI, Overview dashboard, Branches/Levels CRUD UI, Course CRUD with full fields, Notifications composer, Audit Log viewer, Access Requests |
| `src/lib/jsonExtractor.ts` | Integrate with schemaEngine for normalization step |
| `src/lib/firestoreSync.ts` | Add CRUD for courses, questions, resources, flashcards, quizzes, notifications, audit log, filter indexes, schema templates, import logs |
| `src/pages/VivaPrep.tsx` | Replace hardcoded filters with dynamic filter rendering from filter_indexes |
| `src/pages/Index.tsx` | Use enhanced course data (accessType, status fields) |
| `src/components/CsvMapper.tsx` | Integrate with schema templates for auto-mapping |

---

## Technical Notes

**Batched writes**: Firestore batches max 500 operations. For large imports, chunk into multiple batches and commit sequentially. Wrap each batch in try/catch — if one fails, log which records failed and continue.

**File hash**: Use a simple hash function (same pattern as existing `hashColor` but for content) to generate a fingerprint of the uploaded file content. Store in import_logs for dedup.

**Filter index performance**: Each project gets one filter_indexes document (or subcollection if many filters). On VivaPrep load, fetch once and cache in state. No repeated reads.

**Backward compatibility**: Existing questions without schema mapping continue to work — VivaPrep falls back to hardcoded Category/Proctor/Tags filters when no filter_indexes exist for a project. New imports that use the schema engine generate indexes; old data is unaffected.

**No localStorage for critical data**: All schema templates, import logs, filter indexes, and audit logs go to Firestore. Only UI state (which admin tab is active, preview data before import) stays in component state.

