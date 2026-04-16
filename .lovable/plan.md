

# VivaVault — Unified Resources, Multi-College, Theme & UX Pass

The request spans ~12 major systems. To ship real working code (not placeholders), I'm grouping them into one cohesive pass focused on the highest-impact items. Mobile-native rebuild, full image management system, and Canvas v2 are intentionally deferred to a follow-up — they each warrant their own dedicated pass to be done right.

## Scope (this pass)

### 1. Resources system — full rebuild
**Files:** `src/pages/Resources.tsx` (rewrite), `src/components/ResourceManager.tsx` (new), `src/components/ResourceViewer.tsx` (extend)

- Course dropdown at top (default "All Courses") fed from `/projects` collection, scoped by `selectedCollegeId`
- Folder hierarchy via `parentFolderId` on resources + new `/resourceFolders` collection (nested unlimited)
- Categories: predefined + admin custom (stored in `/resourceCategories`)
- Admin "Add Resource" modal with Title, Description, Type (predefined + custom), Category, Course, Folder, plus 4 source modes: File upload (Firebase Storage), External URL, HTML content, Note text
- In-app PDF + HTML viewer (existing `ResourceViewer` extended) — no external redirects
- Card + list view toggle, search, lazy load (12/page)
- Strict permissions: admin = full CRUD with toolbar; user = read-only

### 2. Course → Continue → Selection page
**Files:** `src/pages/CourseSelect.tsx` (new), `src/components/CourseCard.tsx` (edit), `src/App.tsx` (route)

- Remove "Resources" button from `CourseCard`; single "Continue" → `/course/:id/select`
- Selection page shows two large cards: **Question Bank** → `/course/:id/questions` (alias to existing project route) and **Resources** → `/course/:id/resources`
- Routes added; existing `/project/:id/viva` aliased

### 3. Multi-college tenant (Phase 8)
**Files:** `src/contexts/AuthContext.tsx`, `src/pages/CollegeSelect.tsx` (new), `src/lib/firestoreSync.ts`, `src/pages/Index.tsx`, `src/components/Layout.tsx`, `src/App.tsx`

- `selectedCollegeId` field on user profile; `colleges` collection with name/type/logo/adminUIDs
- Post-login gate: if no `selectedCollegeId`, render full-page `CollegeSelect` (search + grid of cards)
- Homepage queries scoped by `selectedCollegeId` (filter projects)
- Profile dropdown gets "Switch Institution" → clears `selectedCollegeId`
- Super-admin (existing fallback emails) sees all colleges

### 4. NotesOS nested folders + strict permissions
**Files:** `src/components/notes/NotesSidebar.tsx`, `src/pages/Notes.tsx`, `src/lib/notesFirestore.ts`

- Folders support unlimited nesting via `parentFolderId` (already in schema; render recursively)
- Drag-and-drop folder/page reordering across any depth (HTML5 DnD)
- Strict role gate: My Workspace = full CRUD; Public Workspace = admin-only CRUD (read-only badge for users); guests = read-only everywhere
- Hide all create/edit/delete affordances when `isReadOnly`

### 5. Theme & layout unification
**Files:** `src/index.css`, `src/components/Layout.tsx`

- Audit and consolidate color tokens: define a single 3-layer surface system (`--surface-base`, `--surface-raised`, `--surface-elevated`) and 3-tier text (`--text-primary/secondary/muted`)
- Remove all hardcoded `bg-white`, `bg-gray-*`, `bg-[hsl(...)]` from page files; replace with tokens
- Eliminate box-in-box: cards get one bg + one border + one radius (12 or 16px)
- Verify both light + dark modes pass on every page
- Fullscreen / dock-mode transition: when `mode === "dock"` or `fullBleed`, page wrapper goes `w-screen h-screen` with no max-width and no padding leftover; smooth 200ms fade between modes

### 6. Smart greeting + streak
**Files:** `src/components/GreetingBanner.tsx` (new), `src/pages/Dashboard.tsx`, `src/lib/spacedRepetition.ts`

- Time-aware greeting (Good morning/afternoon/evening + name + streak)
- First-time users: full-screen welcome overlay (skippable)
- Returning users: dashboard banner with streak + milestone celebration at 3/7/30/100 days
- Streak update is idempotent per calendar day (already partially done in `spacedRepetition.ts` — extend with `lastActiveDate` guard)

## Out of scope (follow-up passes)

- **Full mobile-native rebuild** — touched lightly (existing MobileBottomNav stays, fullscreen fix helps), but a true touch-first rebuild of editor/calendar needs its own dedicated session
- **Cross-app image management system** — Resources gets file upload via Firebase Storage; a unified picker for courses/notes/projects is separate work
- **Canvas v2 with infinite board / connected nodes** — current minimal canvas stays; rebuild needs its own pass
- **NotesOS Add-Resource form variants** — covered by item #1 instead

## Execution order (parallel where safe)

1. CSS tokens + Layout fullscreen fix (foundation — everything else uses these)
2. AuthContext + CollegeSelect + Index scoping (parallel branch)
3. Resources rewrite + CourseSelect page + CourseCard edit (parallel branch)
4. NotesSidebar nested folders + permissions (parallel branch)
5. GreetingBanner + Dashboard integration (last — uses everything)
6. TypeScript build verification

