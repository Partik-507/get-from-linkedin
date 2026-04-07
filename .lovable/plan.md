

# Notes OS — Complete Rebuild Plan

## Summary

Complete rebuild of the Notes OS into a dual-world system (My Workspace + Public Library) with a premium Notion/Obsidian-level editor, zero-cost architecture, and freemium monetization. The existing 937-line monolith and 11 component files are replaced with a modular, production-grade system.

## Current State

- `Notes.tsx`: 937-line monolith with basic TipTap editor, sidebar, tabs, graph/canvas/database views
- 10 component files under `src/components/notes/` (SlashCommandMenu, GraphView, CanvasView, etc.)
- Data stored flat in `users/{uid}/notes` with content inline (not separated)
- No Public Library, no workspace toggle, no freemium gates, no focus mode, no cover images
- Slash commands work but limited (no callout, math, toggle, YouTube, PDF, mention, [[link]])
- SharedNote page exists but minimal

---

## Phase 1: Data Layer & Core Architecture

**New data model with content separation:**
- Split note metadata from content: metadata at `users/{uid}/notes/{noteId}`, content at `users/{uid}/notes/{noteId}/content/body`
- Add fields: `coverImage`, `icon`, `wordCount`, `characterCount`, `lastOpenedAt`, `publishedNoteId`, `type` (document/canvas/table)
- Folder model: add `color`, `icon`, `order` fields
- Public Library: `publicNotes/{id}` with author info, likes/views/saves/forks counters, status (pending/approved/published), branch/level/subject
- Public note interactions: `publicNotes/{id}/likes/{userId}`, `users/{uid}/savedPublicNotes/{id}`
- Version snapshots: `users/{uid}/notes/{noteId}/versions/{timestamp}` (keep last 20)

**Caching strategy:**
- Enable Firestore offline persistence via `enableIndexedDbPersistence(db)` in firebase.ts
- localStorage secondary cache keyed by `note_{id}_{updatedAt}` for note content
- Sidebar only fetches metadata documents, never content
- Debounce saves to 1.5s of inactivity

**Files created:** `src/lib/notesFirestore.ts` (all CRUD, caching, publish/fork/like helpers)

## Phase 2: Page Shell & Dual-World Toggle

**Replace the Layout wrapper** with a full-bleed Notes OS layout:
- Remove `<Layout>` wrapper, build custom full-height layout
- Top bar: breadcrumb (left), "My Workspace / Public Library" toggle (right) with fade transition
- Three-panel layout: sidebar (260px, collapsible), editor (flex), details panel (260px, slide-in on demand)
- State machine for world switching: workspace vs library mode changes sidebar content, main area, and available actions

**Files modified:** `src/pages/Notes.tsx` (complete rewrite as shell/router)

## Phase 3: Sidebar — My Workspace

**Complete sidebar rebuild:**
- Search input with live results dropdown (title + content snippet with highlighted match)
- View mode buttons: Editor, Graph, Canvas, Table
- Tag pills section with click-to-filter
- Recent section (last 5 opened, from localStorage)
- Pinned section
- Full nested folder/file tree with unlimited depth
- Right-click context menus: folder (new note, subfolder, rename, color picker, icon picker, move, duplicate, delete) and note (open in new tab, rename, duplicate, move, pin, copy link, publish, delete)
- Drag-and-drop reordering between folders
- Bottom: New Note (purple), New Folder (outlined), Import button
- Collapsible to 0px with toggle button
- Smooth width transition animation (200ms)

**Files created:** `src/components/notes/NotesSidebar.tsx`, `src/components/notes/FolderTree.tsx`, `src/components/notes/SearchResults.tsx`

## Phase 4: Rich Text Editor (Core Product)

**TipTap editor with all block types:**
- Keep existing extensions: StarterKit, TaskList, TaskItem, Highlight, Link, Image, Table suite
- Add new extensions: `@tiptap/extension-underline`, `@tiptap/extension-text-align`, `@tiptap/extension-color`, `@tiptap/extension-text-style`, `@tiptap/extension-placeholder`, `@tiptap/extension-typography`
- Custom extensions built inline:
  - **Callout block**: custom Node with color + emoji attributes, rendered as colored box with icon
  - **Toggle block**: custom Node with collapsible content using details/summary pattern
  - **Math block**: custom Node rendering LaTeX via KaTeX (loaded from CDN, `katex` npm package)
  - **YouTube embed**: custom Node accepting URL, rendering responsive iframe
  - **PDF embed**: custom Node rendering inline viewer via `react-pdf` or iframe for Google Drive links
  - **Note link `[[]]`**: custom Mark/Node that detects `[[` typing, opens suggest dropdown filtered by note titles, inserts styled clickable link, stores linked note ID for backlink computation
  - **Mention `@`**: custom Node with suggest dropdown

**Floating bubble toolbar:** appears on text selection with Bold, Italic, Underline, Strikethrough, Code, Highlight (color picker), Text color, Link, Alignment options

**Slash command menu rebuild:** expand from 12 to 18+ commands including all new block types, with icons, descriptions, keyboard hints, search-as-you-type, arrow key navigation

**Smart paste:** detect clipboard HTML (from Notion/Docs/ChatGPT), Markdown, or plain text and convert to appropriate TipTap blocks preserving formatting

**Note header area:** large editable title input (separate from TipTap), tag chips row, optional cover image (upload or gradient picker), emoji icon picker

**Focus mode:** button that hides sidebar + navbar, centers editor at 720px max-width on clean background

**Files modified:** `src/components/notes/SlashCommandMenu.tsx` (rebuild with all blocks)
**Files created:** `src/components/notes/NoteEditor.tsx`, `src/components/notes/BubbleToolbar.tsx`, `src/components/notes/NoteHeader.tsx`, `src/components/notes/FocusMode.tsx`, `src/components/notes/extensions/CalloutExtension.ts`, `src/components/notes/extensions/ToggleExtension.ts`, `src/components/notes/extensions/MathExtension.ts`, `src/components/notes/extensions/YoutubeExtension.ts`, `src/components/notes/extensions/NoteLinkExtension.ts`

## Phase 5: Graph View, Canvas, Table View, Backlinks

**Graph View rebuild:**
- Keep force-directed layout from existing GraphView.tsx
- Enhance: folder-colored cluster boundaries, node size by link count, hover highlights connected edges, click opens note
- Zoom (wheel) and pan (background drag) via SVG viewBox
- Zero additional reads — uses already-fetched note data

**Canvas View rebuild:**
- Keep existing drag mechanics from CanvasView.tsx
- Add: drop notes from sidebar, edge drawing for linked notes, text blocks and image cards (not just notes)
- Canvas data persisted to `users/{uid}/canvases/{id}`
- Canvas CRUD in sidebar under "Canvases" section

**Table View rebuild:**
- All notes in sortable/filterable spreadsheet: Title, Folder, Tags, Word Count, Created, Modified, Status
- Column sort, folder/tag filter dropdowns
- Bulk select for move/tag/delete operations
- Click row to open note

**Backlinks panel:**
- Right sidebar showing incoming links (notes that contain `[[this note]]`)
- Computed client-side from loaded notes
- Click backlink to open that note

**Files modified:** `src/components/notes/GraphView.tsx`, `src/components/notes/CanvasView.tsx`, `src/components/notes/DatabaseView.tsx`, `src/components/notes/BacklinksPanel.tsx`

## Phase 6: Public Library

**New world accessible via toggle:**
- Browse interface replacing the three-panel editor layout
- Search bar (title, tags, subject, author)
- Filter chips for subjects and branches
- Responsive card grid showing: cover image/gradient (hash-based unique gradient per note), title, description excerpt, author name+avatar, subject/branch tags, like count, view count, Read and Save buttons
- "VivaVault Official" badge on admin-created notes

**Read view:** full-width clean reading layout at 720px max-width, TipTap rendered content, author profile header, like/save/fork buttons, related notes sidebar

**Publishing flow:** right-click note → Publish → modal for description, subject, branch, level, tags → submits with status "pending" → admin approves in Admin panel → appears in Public Library

**Fork:** copies public note into user's private workspace as new editable note

**Files created:** `src/components/notes/PublicLibrary.tsx`, `src/components/notes/PublicNoteCard.tsx`, `src/components/notes/PublicNoteReader.tsx`, `src/components/notes/PublishModal.tsx`

## Phase 7: Templates, Version History, Import/Export, Search

**Templates:**
- Template picker modal on new note creation (dismissible for blank)
- 6 built-in templates: Study Notes, Project Report, Meeting Notes, Daily Journal, Concept Map, Blank
- Templates stored in code (zero Firestore reads)
- User custom templates saved to `users/{uid}/noteTemplates/{id}`

**Version History:**
- Keep existing VersionHistory.tsx pattern
- Save snapshot on auto-save when content differs by >50 chars from last version
- Keep last 20 versions per note
- Preview and restore UI in slide-in panel
- Side-by-side diff view (simple HTML diff highlighting)

**Import:**
- Markdown (.md): parse to TipTap blocks
- HTML (.html): direct TipTap parse
- Plain text (.txt): paragraphs
- Notion export (.zip): extract HTML files, convert, recreate folder structure

**Export:**
- Markdown (free): TipTap HTML → Markdown conversion
- PDF (paid): browser print-to-PDF with clean stylesheet
- HTML (paid): self-contained HTML with inline styles

**Search:**
- Sidebar search: Firestore title query + Fuse.js local index over cached content
- Results dropdown with title + snippet + highlighted match
- Debounced 150ms

**Files modified:** `src/components/notes/TemplatePickerModal.tsx` (add custom templates, more built-ins), `src/components/notes/VersionHistory.tsx` (diff view)
**Files created:** `src/components/notes/ImportExport.tsx`

## Phase 8: Freemium, Monetization, Polish & Mobile

**Freemium gates (stored in user profile `plan` field):**
- Free: 100 notes, 5 folders, basic blocks only, no version history, no graph (blurred with upgrade overlay), no publish, Markdown export only
- Student (₹99/mo): unlimited notes/folders, all blocks, version history, graph, export PDF/HTML, can publish
- Pro (₹199/mo): collaboration sharing, note analytics, custom templates, AI assistant

**Upgrade prompts:** inline tooltips on locked blocks, blurred graph overlay with upgrade card, limit counters in sidebar footer

**UI polish:**
- Serif font (Lora/Merriweather) for editor content, sans-serif (DM Sans) for UI chrome
- Dark theme: sidebar slightly lighter than editor background, warm off-white text
- Folder colors as subtle left-border accents
- Slash command palette: dark floating card, smooth scale animation, icons + keyboard hints
- Hash-based unique gradients for public note cards without custom covers
- Smooth animations: sidebar collapse (200ms), version history slide-in, template picker scale-up, block insertion fade-in

**Mobile:**
- Single-panel layout on small screens
- Sidebar as hamburger overlay
- Details panel as bottom sheet
- 44px minimum touch targets
- Slash menu positioned above mobile keyboard

**Keyboard shortcuts:**
- Cmd+N: new note, Cmd+K: command palette, Cmd+S: force save, Cmd+Shift+F: focus search, Cmd+\: toggle sidebar, Cmd+G: graph view

**Note statistics:** word count always visible top-right, click to expand full stats (words, chars, sentences, paragraphs, reading time)

**Course integration:** when creating note inside an enrolled course folder, auto-tag with course name

**Files created:** `src/components/notes/UpgradePrompt.tsx`, `src/components/notes/NoteStats.tsx`
**Files modified:** `src/index.css` (editor typography, animations), `src/lib/firebase.ts` (enable offline persistence)

---

## Total File Count

| Action | Count | Files |
|--------|-------|-------|
| Complete rewrite | 1 | Notes.tsx |
| Major rebuild | 6 | SlashCommandMenu, GraphView, CanvasView, DatabaseView, BacklinksPanel, TemplatePickerModal, VersionHistory |
| New components | ~15 | NotesSidebar, FolderTree, SearchResults, NoteEditor, BubbleToolbar, NoteHeader, FocusMode, PublicLibrary, PublicNoteCard, PublicNoteReader, PublishModal, ImportExport, UpgradePrompt, NoteStats, 5 extensions |
| Infrastructure | 2 | notesFirestore.ts, firebase.ts update |
| Styles | 1 | index.css additions |
| Dependencies | ~3 | katex, fuse.js, @tiptap/extension-underline + color + text-style |

## Technical Notes

- Content separation (metadata vs body) is the key cost optimization — sidebar browsing costs near-zero reads
- Offline persistence + localStorage double-cache eliminates 80%+ of repeat reads
- 1.5s debounce on saves reduces writes from thousands to ~10-20 per session
- Public Library queries are read-heavy but cacheable — Firestore offline cache handles repeat visits
- Graph/canvas/table views use already-fetched data, zero additional reads
- Templates stored in code, not Firestore
- All TipTap custom extensions use `Node.create()` / `Mark.create()` — no external deps beyond katex and fuse.js
- Hash-based gradients generated client-side from note ID using simple hash-to-hue conversion

