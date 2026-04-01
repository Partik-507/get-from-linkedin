

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
- Step 8: Select target project → "Confirm Import" → batched atomic write + filter index generation + import log + audit log

### 2. VivaPrep Dynamic Filter Rendering (`src/pages/VivaPrep.tsx`)

Replace hardcoded Category/Proctor/Tags filters with schema-driven approach:

- On mount, fetch `/filter_indexes/{projectId}` from Firestore
- If filter indexes exist: render each filter dynamically based on `filterType` (dropdown → Select, multi_select → chip toggles, range → Slider, date_picker → date input)
- If no filter indexes: fall back to current hardcoded filters (backward compat)
- Generic filter state as `Record<string, string | string[]>`
- Keep all existing features: frequency pills, search, sort, bookmarks, upvotes, studied tracking

### 3. StudyMode Calendar Enhancement (`src/pages/StudyMode.tsx`)

- Year view, clickable time slots pre-filling creation modal, drag-to-reposition events
- Session drawer for viewing/editing block details
- Connect study blocks to enrolled courses from Firestore
- Planned vs actual time tracking

### 4. Notes OS Polish (`src/pages/Notes.tsx`)

- Version history snapshots on save
- .md/.html file import
- Graph view parsing `[[note-title]]` links

---

## Files Modified

| File | Changes |
|------|---------|
| `src/pages/Admin.tsx` | 12 sections, schema mapping UI, overview, branch/level CRUD, course CRUD with access control, notifications, audit log |
| `src/pages/VivaPrep.tsx` | Dynamic filter rendering from filter_indexes with backward-compatible fallback |
| `src/pages/StudyMode.tsx` | Year view, clickable slots, session drawer, course integration |
| `src/pages/Notes.tsx` | Version history, file import, graph view |

No new files needed — all required utility functions already exist in `schemaEngine.ts` and `firestoreSync.ts`.

