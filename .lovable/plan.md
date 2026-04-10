

# Notes OS + Study OS — Complete Rebuild Plan

## Current State
- **Notes.tsx** (504 lines): Firestore-only 2-world toggle (workspace/library), basic TipTap editor, working CRUD
- **StudyMode.tsx** (1869 lines): Calendar with 4 views, tasks with NLP parsing, habits, focus engine with strict mode, basic analytics — functional but visually sparse
- **NoteEditor.tsx** (222 lines): TipTap with StarterKit, limited formatting toolbar
- **SlashCommandMenu.tsx** (192 lines): 18 commands, many use `prompt()` dialogs, no Page/Database blocks
- **NotesSidebar.tsx** (351 lines): Folder tree, context menus, tag filter, view switchers

---

## Phase 1: Notes OS — Local-First My Workspace via File System Access API

My Workspace switches from Firestore to local filesystem. On first open, centered prompt to select a folder via `window.showDirectoryPicker()`. Store `FileSystemDirectoryHandle` in IndexedDB so it persists. All notes = `.md` files in that folder. Folders in the sidebar match real filesystem folders.

- New `src/lib/localFileSystem.ts`: recursive directory read, file CRUD, `_assets/` subfolder for images, IndexedDB handle storage
- Convert TipTap HTML to Markdown on save (via `turndown`), Markdown to HTML on load (via `marked`)
- Sidebar shows real filesystem tree with infinite nesting, expand/collapse arrows
- File/folder create, rename, delete, move all write to local filesystem
- Add 3-mode toggle: My Workspace, Public Workspace, Public Library (Public Library untouched)

**Dependencies**: `idb-keyval`, `turndown`, `marked`

## Phase 2: Notes OS — Notion-Style Page System & Editor Header

When user selects "Page" from slash commands: creates a sub-page (child file/subfolder locally, child Firestore doc in public workspace), adds to sidebar as nested child, opens it in editor.

- Sidebar reflects page nesting like Notion: indented tree with expand/collapse arrows
- Each page has: large editable title at top, emoji icon picker, optional cover image (gradient presets + upload stored in `_assets/`)
- Breadcrumb navigation showing full path
- Pages nest infinitely deep

## Phase 3: Notes OS — Complete TipTap Editor Rebuild

**Slash command fix**: Rebuild as TipTap Extension that reliably triggers on `/` at any new line start. Beautiful floating dark card positioned at cursor with icons, descriptions, keyboard hints, arrow key nav, Enter to select, type-to-filter.

22+ slash commands all fully functional:
- Paragraph, H1-H4, Bullet/Numbered/Task lists
- Callout (custom Node with color + emoji picker)
- Code Block (PrismJS highlighting, language dropdown with 20+ languages, copy button with checkmark animation, auto-detect language on paste)
- Quote, Table, Image, YouTube embed, Divider
- Toggle (collapsible details/summary)
- Math (KaTeX LaTeX rendering)
- Mention (@), Note Link ([[]])
- Database (inline table), Page (creates sub-page)

**Floating bubble toolbar**: On text selection — Bold, Italic, Underline, Strikethrough, Code, Highlight (color picker), Text color, Link (inline popover, not prompt), Alignment

**Block interactions**: Drag handle on hover, right-click context menu (Turn into, Color, Duplicate, Move, Delete, Comment), multi-block selection with bulk toolbar

**Smart paste**: DOMParser converts clipboard HTML to correct TipTap blocks (headings, lists, code, tables, bold/italic, links, images)

**URL paste detection**: Popover with Dismiss / Bookmark / Embed

**Image paste**: Ctrl+V → instant insert with 12px rounded corners + shadow, click for resize handles + toolbar. Stored in local `_assets/`

**Font selector**: Toolbar dropdown with 15 Google Fonts, each name rendered in its own font

**Collapsible headings**: Hover shows collapse arrow, collapses content until next equal/higher heading

**Dependencies**: `katex`, `prismjs`

## Phase 4: Notes OS — Public Workspace + Sharing

Same UI as My Workspace but backed by Firestore. Check UID against `/publicWorkspace/settings/allowedEditors`. If allowed: full editor with real-time saves. If not: read-only mode with badge.

- Submit Note button: modal with title, content, subject, branch → `/publicWorkspace/submissions/{id}` with status "pending"
- Admin approves/rejects in admin panel
- Share button on every note → modal with URL `/shared/notes/{noteId}` → stores content snapshot in `/sharedNotes/{noteId}`
- SharedNote page renders clean read-only view in dark theme

## Phase 5: Notes OS — Version History, Graph, Table, Import/Export

- **Version History**: IndexedDB snapshots for local workspace, Firestore for public. Slide-in panel, preview, restore.
- **Graph View**: D3.js force-directed from `[[]]` links, folder-colored nodes, zoom/pan/click
- **Table View**: Sortable spreadsheet (title, folder, tags, word count, dates)
- **Import**: Markdown (.md), HTML (.html), Notion export (.zip) — each creates real editable notes
- **Export**: Markdown (free), HTML, PDF (browser print with clean stylesheet)

## Phase 6: Study OS — Calendar Rebuild (Google Calendar Quality)

Complete visual rebuild with 5 view modes (Day, Week, Month, Year, Agenda).

- Week view: 7 columns with hourly gridlines, current time red line updating every minute
- Event blocks: 20% opacity event-color background, 3px left border, white text, hover brightens
- Click empty slot → inline quick-create popover (title + time + Event/Task tabs + More Options)
- Full event modal: title, date/time with timezone, all-day, recurrence, location/URL, multiple reminders with type selector, calendar selector, visibility, status, rich text description, guests panel
- Drag to move/resize events
- Conflict detection (orange border on overlaps)
- Client-side recurrence expansion
- Google Calendar OAuth integration: fetch calendars, sidebar toggle list, display alongside native events

## Phase 7: Study OS — Tasks, Habits, Focus Engine Polish

**Tasks**: Polish 4 views, schedule-to-calendar with free slot recommendation based on peak hours, drag tasks to calendar, subtask management

**Habits**: Satisfying checkmark animation, daily check-in modal, habit dots on calendar, streak freezes

**Focus Engine**: 
- Quick Focus → modal asking duration (25/50/90/custom) + mode before launching
- Wallpaper presets by category (Nature, Abstract, Minimal, Space, Dark, Light)
- 8 soundscape presets
- 40 motivational messages across 5 themes for strict mode
- Break enforcement (breathing exercise screen after 25/50 min)
- Study Together rooms with Firestore heartbeats

## Phase 8: Analytics, Smart Week Plan, Global UI Polish

**Analytics** (5 sections): Focus Heatmap (365-day purple grid), Daily Patterns (hourly bar chart + interpretation), Task Completion Rate (weekly bars + alert), Habit Consistency Matrix, Session Quality Trends (mood vs focus + burnout detection)

**Smart Week Plan**: Analyze unscheduled tasks + free slots + peak hours → suggested schedule on mini week preview → accept all/individual/dismiss

**Morning Briefing**: 5s full-screen overlay (greeting, date, tasks, habits, streak, first session)

**Global UI Polish**:
- Premium dark theme: sidebar lighter than editor, warm off-white text
- Editor max-width 720px centered
- Smooth 200ms fade transitions everywhere
- Sidebar collapse animations
- Event blocks with proper color accents
- Deep purple-tinted shadows on modals
- Hover states on all elements
- Active indicators in sidebar nav
- Mobile: single-panel, hamburger sidebar, bottom sheet
- Google Fonts: Lora for editor content + 14 others for font selector
- CSS animations for block insertions, template picker, version history slide-in

---

## Files Summary

| File | Action |
|------|--------|
| `src/lib/localFileSystem.ts` | **New** — File System Access API helpers, IndexedDB handle storage |
| `src/lib/publicWorkspace.ts` | **New** — Public workspace Firestore CRUD + permissions |
| `src/components/notes/BubbleToolbar.tsx` | **New** — Floating selection toolbar |
| `src/components/notes/BlockHandle.tsx` | **New** — Drag handle + context menu |
| `src/pages/Notes.tsx` | **Rewrite** — 3-mode toggle, local filesystem, public workspace |
| `src/pages/StudyMode.tsx` | **Rewrite** — Premium calendar, polished all 5 systems |
| `src/components/notes/NoteEditor.tsx` | **Rebuild** — Bubble toolbar, block handles, smart paste, font selector |
| `src/components/notes/SlashCommandMenu.tsx` | **Rebuild** — 22+ commands, reliable `/` trigger, Page block |
| `src/components/notes/NotesSidebar.tsx` | **Rebuild** — Local file tree, Notion-style page nesting |
| `src/components/notes/GraphView.tsx` | **Polish** |
| `src/components/notes/DatabaseView.tsx` | **Polish** |
| `src/components/notes/VersionHistory.tsx` | **Update** — IndexedDB for local |
| `src/components/notes/ImportExport.tsx` | **Rebuild** — Working MD/HTML/Notion import |
| `src/pages/SharedNote.tsx` | **Update** — Clean read-only view |
| `src/index.css` | **Update** — Animations, typography, theme |
| `index.html` | **Update** — Google Fonts |
| `package.json` | **Update** — Add idb-keyval, turndown, marked, katex, fuse.js, prismjs |

All 8 phases implemented in parallel in one go.

