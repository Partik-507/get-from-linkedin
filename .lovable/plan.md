# VivaVault — Admin OS & Dynamic Filters Expansion

## What Gets Built

### 1. Admin Panel Complete Rebuild (`src/pages/Admin.tsx`)

Expand the sidebar from 7 sections to 12:

| Section | Status | What's Built |
|---------|--------|-------------|
| Overview | NEW | Stats cards (courses, questions, pending, users), quick actions |
| Branches & Levels | NEW | Full CRUD for branches (name, shortName, color) and levels (name, branchId, order) with color picker |
| Courses & Projects | ENHANCED | Enhanced form: title, code, type, branch, level, accessType (public/private/premium), status, iconColor, unlockConditions |
| Schema & Import | NEW | Full schema mapping UI — paste/upload JSON → detect schema → interactive field mapping table → save template → normalize → dedup → preview report → confirm import with batched atomic writes |
| Import Questions | EXISTING | Keep as-is (backward compat) |
| Question Submissions | EXISTING | Keep as-is |
| Resources | EXISTING | Keep as-is |
| Notes | EXISTING | Keep as-is |
| Notifications | NEW | Compose form (title, message, target), send, history list with delete |
| Submissions | EXISTING | Keep as-is |
| Audit Log | NEW | Table of all admin actions with timestamp, user, action, entity type, details |
| Admin Roles | EXISTING | Keep as-is |

**Schema & Import section details:**
- Step 1: Paste/upload JSON → parsed in memory, never touches DB
- Step 2: Schema detection table showing each field's name, detected type, sample values, unique count
- Step 3: Interactive mapping — each field gets a Role dropdown (Primary ID, Question, Answer, Filterable, Searchable, Sortable, Metadata, Skip), optional filter type (dropdown/multi-select/range/date), optional rename field
- Step 4: Auto-suggest button applies `autoSuggestMappings()` from schemaEngine
- Step 5: "Save as Template" stores config to Firestore; "Load Template" dropdown restores saved mappings
- Step 6: File hash check — warns if same file was already imported
- Step 7: Normalization + dedup preview — shows counts (new, duplicate, merged, invalid)
- Step 8: Select target project → "Confirm Import" → batched atomic write via `batchWriteQuestions()` + filter index generation + import log + audit log

### 2. VivaPrep Dynamic Filter Rendering (`src/pages/VivaPrep.tsx`)

Replace the hardcoded Category/Proctor/Tags filter system with a schema-driven approach:

- On mount, fetch `/filter_indexes/{projectId}` from Firestore alongside questions
- If filter indexes exist: render each filter dynamically based on `filterType`:
  - `dropdown` → Select component
  - `multi_select` → chip/pill toggles (like current category pills)
  - `range` → Slider component
  - `date_picker` → date input
- If no filter indexes exist: fall back to current hardcoded Category/Proctor/Tags filters (backward compatibility)
- Filter state stored as `Record<string, string | string[]>` — generic, not field-specific
- Filtering logic uses a generic combiner matching any active filter against question fields + customFields
- Keep existing: frequency pills, search, sort, bookmarks, upvotes, studied tracking, submission cards

### 3. StudyMode Calendar Enhancement (`src/pages/StudyMode.tsx`)

- Add year view alongside existing day/week/month
- Clickable time slots that pre-fill the creation modal with correct date/time
- Drag support for event repositioning (HTML5 drag API)
- Session drawer (Sheet component) for viewing/editing block details without modal
- Connect study blocks to enrolled courses (fetch from Firestore)
- Record completed sessions with actual vs planned time comparison

### 4. Notes OS Polish (`src/pages/Notes.tsx`)

- Ensure slash command menu works with TipTap (already partially built)
- Add version history: on save, snapshot current content to `/users/{uid}/notes/{noteId}/versions/{versionId}`
- File import: button to import .md/.html files via FileReader, parse and insert into editor
- Graph view: parse `[[note-title]]` patterns from note content, render SVG force-directed graph

---

## Files Modified

| File | Changes |
|------|---------|
| `src/pages/Admin.tsx` | Complete rewrite — 12 sections, schema mapping UI, overview dashboard, branch/level CRUD, course CRUD with access control, notifications composer, audit log viewer |
| `src/pages/VivaPrep.tsx` | Dynamic filter rendering from filter_indexes, generic filter state, backward-compatible fallback |
| `src/pages/StudyMode.tsx` | Year view, clickable slots, session drawer, course integration |
| `src/pages/Notes.tsx` | Version history, file import, graph view improvements |

## No New Files Needed

All logic integrates into existing files. `schemaEngine.ts` and `firestoreSync.ts` already have all the required functions.

## Technical Notes

- Schema mapping UI renders a `<Table>` where each row = detected field, columns = Field Name, Type, Samples, Role (Select), Filter Type (Select, shown only when role=filterable), Rename (Input)
- Template save/load uses `saveSchemaTemplate`/`getSchemaTemplates` from firestoreSync
- Dedup report card shows 4 counts with colored badges before import confirmation
- VivaPrep backward compat: check `filterIndexes.length > 0` — if false, render old hardcoded filters
- Batched writes use existing `batchWriteQuestions()` which chunks at 450 records per batch
- Audit log table fetches via `getAuditLogs()`, renders with timestamp formatting and action badges
