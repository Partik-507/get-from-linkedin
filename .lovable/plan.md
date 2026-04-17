

# Mobile-Native Rebuild — StudyOS Calendar + NotesOS + Canvas + Command Center

Building 5 tracks in parallel. Concise scope, high-impact files only.

## Track A — StudyOS Mobile Calendar (Google Calendar style)

**`src/components/CalendarView.tsx`** — Mobile branch (`md:hidden`):
- Edge-to-edge vertical day timeline (12am–11pm hourly slots, 60px each)
- Horizontal swipe between days (pointer events, threshold 50px → ±1 day)
- All-day events pinned at top (gray pills like reference)
- Timed events as left-bordered cards inside hour slots
- Tap empty slot → quick-create at that hour
- Hide week/month/year grids on mobile entirely

**`src/pages/StudyMode.tsx`** — Mobile top bar:
- Compact: `[hamburger] [Month ▾] ...... [search] [focus] [view-toggle] [profile]`
- View toggle = small purple pill segmented (Day / 3-Day / Week)
- Remove "Plan Smart Week" / "Sync" / desktop buttons on mobile
- FAB bottom-right (`+` 56px, purple gradient, above bottom nav)
- Sidebar = slide-out drawer (Sheet from left), contains: search field + section links (Calendar, Tasks, Habits, Focus, Analytics) + Google Calendar status row
- Profile icon in top-right opens Google Calendar connect/disconnect sheet

## Track B — NotesOS Mobile (Notion style)

**`src/pages/Notes.tsx`** — Mobile redesign:
- Top bar: workspace switcher chip (My / Public / Library) + ⋯ menu + inbox icon
- Recents row: horizontal-scroll cards (3 most recent notes)
- Page list below with nested folder tree (tap to expand `>` → `v`)
- Tap a page → opens full-screen editor with only `[<]` back button at top
- Swipe-from-left edge → opens sidebar drawer with full nav
- Bottom: search pill + "Ask AI" pill + edit FAB (mirrors Notion)

**`src/components/notes/NoteEditor.tsx`** — Mobile:
- Full-bleed, no padding container
- Sticky bottom toolbar: Bold, Italic, H1, List, Link, Image, Slash (44px each)
- Back button top-left only when on mobile

**`src/components/notes/NotesSidebar.tsx`** — Mobile drawer mode:
- Full-height Sheet, search field at top, nested page tree, inline page actions

## Track C — Canvas v2 (true infinite board inside NotesOS)

**`src/components/notes/CanvasView.tsx`** — Rewrite:
- Pan: drag empty space (pointer)
- Zoom: wheel + pinch (touch) — `transform: scale()` on inner layer
- Snap-to-8px grid
- Node types: `note` (links to existing page), `image`, `file`, `text`
- Drag from sidebar → drop on canvas creates linked node
- Edges: shift-click two nodes → create SVG bezier edge
- Mini-map bottom-right (160×100, viewport rectangle)
- Persisted via existing `canvasNodes` array on note metadata
- Admin-only edit in Public Workspace (read-only otherwise)
- Add `isCanvas: true` flag on note creation → renders Canvas instead of editor

## Track D — Command Center (FloatingDock) full rebuild

**`src/components/FloatingDock.tsx`** — Complete rewrite:
- Resizable: 8 handles (corners + edges), free width/height, no min-width blocking
- Min size: 48×48 (just icons mode); max: viewport bounds
- Drag from header bar; position persisted in localStorage (`dock_pos`, `dock_size`)
- Toggle state machine: `expanded` ↔ `slab` (fix stuck state via single boolean + explicit setters)
- Slab mode (collapsed):
  - Auto-attach to nearest edge (top/bottom/left/right) based on drop position
  - Horizontal slab for top/bottom (h-2, w-24); vertical for left/right (w-2, h-24)
  - Opacity 0.15 default, 0.6 on hover/touch, 1.0 on press
  - Draggable along edge, click expands
- Internal controls: light/dark toggle, size presets (S/M/L), all wired with fresh handlers
- z-index 60, pointer-events properly scoped (slab is `pointer-events-auto`, container behind is `none`)

## Track E — Manifest endpoint

**`src/lib/syncEngine.ts`** — Add `fetchManifest(userId)`:
- Reads `manifests/{userId}` doc OR aggregates from `users/{userId}/allowedContent` collection
- Returns `[{id, type, version, hash, url}]`
- Stores in IndexedDB `manifest` store via `bulkPut`

**`src/contexts/OfflineContext.tsx`** — On first login (no `lastSyncAt`):
- Trigger `fetchManifest(user.uid)` → populate IndexedDB
- Show progress in OfflineIndicator

## Files (~10)

| File | Action |
|------|--------|
| `src/components/CalendarView.tsx` | Mobile day-view + swipe |
| `src/pages/StudyMode.tsx` | Mobile top bar, FAB, drawer |
| `src/pages/Notes.tsx` | Notion-style mobile shell |
| `src/components/notes/NoteEditor.tsx` | Bottom toolbar, back button |
| `src/components/notes/NotesSidebar.tsx` | Drawer mode |
| `src/components/notes/CanvasView.tsx` | Infinite board rewrite |
| `src/components/FloatingDock.tsx` | Full rebuild + slab |
| `src/lib/syncEngine.ts` | fetchManifest |
| `src/contexts/OfflineContext.tsx` | First-login sync trigger |
| `src/index.css` | FAB, slab, swipe-area utilities |

## Notes

- No new deps
- All desktop layouts preserved via `md:` branches
- Canvas uses existing `canvasNodes` schema, just richer node types
- Slab uses CSS `position: fixed` with edge calc; persisted via localStorage

