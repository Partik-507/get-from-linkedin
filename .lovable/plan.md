

# Notes OS — Complete Rebuild Plan

## Summary

Rebuild `src/pages/Notes.tsx` from a 734-line monolith into a modular Notes OS with working slash commands, command palette, backlinks, canvas, templates, version history, tags, search, and publishing. All features built in one pass using existing TipTap + Firebase stack.

## Architecture

```text
src/pages/Notes.tsx          → Main shell (sidebar + router between views)
src/components/notes/
  ├── SlashCommandMenu.tsx   → Floating "/" command popup
  ├── CommandPalette.tsx     → Cmd+K global search/navigate
  ├── BacklinksPanel.tsx     → Right panel showing incoming links
  ├── GraphView.tsx          → Force-directed SVG graph
  ├── CanvasView.tsx         → Freeform draggable note board
  ├── TemplatePickerModal.tsx→ Template selection on create
  ├── VersionHistory.tsx     → Version list + restore dialog
  ├── TagFilter.tsx          → Tag chips + filter panel
  ├── NotePreviewPopover.tsx → Hover preview for [[links]]
  └── DatabaseView.tsx       → Simple table with columns
```

## What Gets Built (All Parallel)

### Phase 1: Editor & Slash Commands
- Install `@tiptap/extension-task-list`, `@tiptap/extension-task-item`, `@tiptap/extension-highlight`, `@tiptap/extension-link`, `@tiptap/extension-image`, `@tiptap/extension-table` (+ row/cell/header)
- Build `SlashCommandMenu.tsx`: TipTap extension using `Extension.create` that listens for `/` keypress, opens a floating div positioned at cursor using `editor.view.coordsAtPos()`, renders filterable list of block types (text, H1-H3, bullet list, numbered list, checklist, quote, code block, divider, table, image), navigable with arrow keys + Enter, search-as-you-type
- Each command inserts the corresponding TipTap node and closes the menu

### Phase 2: Command Palette (Cmd+K)
- `CommandPalette.tsx`: Dialog triggered by `Ctrl/Cmd+K` global keydown listener
- Shows search input + list of: recent notes, all notes filtered by query, actions (New Note, New Folder, Toggle Graph, Toggle Canvas)
- Arrow key navigation, Enter to select, Esc to close
- Registered as a global keyboard shortcut in Notes.tsx

### Phase 3: Backlinks & Advanced Linking
- On save, scan content for `[[note-title]]` patterns using regex
- Store detected links as `linkedNoteIds: string[]` on the note document
- `BacklinksPanel.tsx`: Right sidebar panel showing all notes whose `linkedNoteIds` includes the current note's ID (computed client-side from loaded notes array)
- In-editor: typing `[[` opens a note suggest popup (reuse slash command pattern), filters notes by title, inserts `[[Title]]` as a styled span
- `NotePreviewPopover.tsx`: On hover over `[[link]]` in rendered content, show a popover with note title + first 200 chars of content

### Phase 4: Graph View (Enhanced)
- Extract `GraphView` from Notes.tsx into `GraphView.tsx`
- Implement simple force-directed layout: repulsion between all nodes (Coulomb), attraction along edges (Hooke), damping, run in `requestAnimationFrame` loop for ~60 frames then settle
- Nodes sized by link count, colored by folder
- Click node → open note, hover → show title tooltip
- SVG viewBox manipulation for zoom (wheel) and pan (drag on background)

### Phase 5: Canvas System
- `CanvasView.tsx`: New view mode
- Freeform SVG/div board where notes appear as draggable cards
- Drag notes from sidebar onto canvas (onDrop handler adds card at drop position)
- Cards show note title + first line of content
- Mouse drag to reposition cards, store `{ noteId, x, y, width, height }` array
- Simple line/arrow drawing between linked notes (from `[[]]` references)
- Canvas data saved to Firestore: `users/{uid}/canvases/{id}` with `{ name, nodes[], edges[], createdAt, updatedAt }`
- CRUD for canvases in sidebar under a "Canvases" section

### Phase 6: Templates
- `TemplatePickerModal.tsx`: Dialog shown when clicking "New from Template"
- Predefined templates stored in component: Meeting Notes, Study Notes, Project Plan, Daily Journal, Reading Notes
- Each template = `{ title, content (HTML string), tags }` 
- User templates saved to Firestore `users/{uid}/noteTemplates/{id}`
- On select, creates a new note pre-filled with template content

### Phase 7: Version History
- `VersionHistory.tsx`: Dialog listing saved versions with timestamps
- On auto-save, if content changed significantly (>50 chars diff from last version), save snapshot to `users/{uid}/notes/{noteId}/versions/{versionId}` subcollection
- Keep last 20 versions, show in a scrollable list
- Click version → show read-only preview, "Restore" button replaces current content
- Compare mode: show current vs selected version side-by-side (simple HTML diff highlighting)

### Phase 8: Tags & Filtering
- `TagFilter.tsx`: Horizontal chip bar in sidebar showing all unique tags across notes
- Click tag → filter sidebar to notes with that tag
- In note properties area (below title), show editable tag chips with add/remove
- Tag pages: clicking a tag in the filter shows a "tag view" listing all notes with that tag

### Phase 9: Search Enhancement
- Upgrade sidebar search to search both title AND stripped content
- Show results in a dropdown below search input with highlighted matching text
- Each result shows note title + snippet with match highlighted
- Instant filtering as user types (debounced 150ms)

### Phase 10: Simple Database View
- `DatabaseView.tsx`: Table view for structured notes
- User creates a "database" which is a special folder type
- Columns: Title (fixed), plus user-added columns (text, checkbox)
- Inline editing of cells
- Sort by any column, filter by checkbox state
- Data stored as note properties: `properties: { [columnName]: value }`

### Phase 11: Favorites, Recents, Pinned
- Favorites: Already exists as `isPinned` — show pinned notes in a "Pinned" section at top of sidebar
- Recents: Track last 10 opened notes in localStorage `vv_recent_notes`, show in sidebar under "Recent" collapsible section
- Star icon in note toolbar to toggle pin

### Phase 12: Publishing & Sharing
- "Publish" button in note toolbar → writes to top-level `published_notes/{noteId}` collection with `{ title, content, authorName, publishedAt }`
- Generates a public URL `/shared/:noteId`
- Add route in App.tsx: `<Route path="/shared/:noteId" element={<SharedNote />} />`
- `SharedNote.tsx`: Clean read-only page fetching from `published_notes` collection, no auth required
- Unpublish removes from collection

### Phase 13: Keyboard Shortcuts
- `Ctrl/Cmd+N`: New note
- `Ctrl/Cmd+K`: Command palette  
- `Ctrl/Cmd+S`: Force save (visual feedback)
- `Ctrl/Cmd+Shift+F`: Focus search
- `Ctrl/Cmd+\`: Toggle sidebar
- `Ctrl/Cmd+G`: Toggle graph view
- Register all via `useEffect` with global keydown listener in Notes.tsx

### Phase 14: UI Polish
- Smooth sidebar collapse animation (width transition 200ms)
- Note open/close transitions via AnimatePresence (already imported)
- Better typography: larger title input, proper heading sizes in editor
- Dark mode already supported via ThemeContext
- Hover effects on all interactive elements
- Loading skeleton for note content area

## Data Model Changes

```text
NoteItem (existing + new fields):
  + parentNoteId: string        // for subpages
  + linkedNoteIds: string[]     // outgoing [[links]]
  + icon: string                // emoji
  + properties: Record<string, any>  // for database columns
  + version: number
  + isArchived: boolean
  + deletedAt: any              // soft delete

New Collections:
  users/{uid}/notes/{id}/versions/{vid}  → { content, title, savedAt, version }
  users/{uid}/canvases/{id}              → { name, nodes[], edges[], createdAt }
  users/{uid}/noteTemplates/{id}         → { title, content, tags }
  published_notes/{id}                   → { title, content, authorName, publishedAt, noteId }
```

## Files Created

| File | Purpose |
|------|---------|
| `src/components/notes/SlashCommandMenu.tsx` | Floating "/" command menu with keyboard nav |
| `src/components/notes/CommandPalette.tsx` | Cmd+K global search/navigate overlay |
| `src/components/notes/BacklinksPanel.tsx` | Right panel showing incoming links |
| `src/components/notes/GraphView.tsx` | Force-directed interactive graph |
| `src/components/notes/CanvasView.tsx` | Freeform draggable note board |
| `src/components/notes/TemplatePickerModal.tsx` | Template selection dialog |
| `src/components/notes/VersionHistory.tsx` | Version list + restore |
| `src/components/notes/TagFilter.tsx` | Tag chips + filtering |
| `src/components/notes/NotePreviewPopover.tsx` | Hover preview for links |
| `src/components/notes/DatabaseView.tsx` | Simple table view |
| `src/pages/SharedNote.tsx` | Public read-only note page |

## Files Modified

| File | Changes |
|------|---------|
| `src/pages/Notes.tsx` | Complete rewrite — modular architecture, all view modes, keyboard shortcuts, enhanced sidebar with pinned/recent sections, canvas support, template creation |
| `src/App.tsx` | Add `/shared/:noteId` route |
| `package.json` | Add TipTap extensions: task-list, task-item, highlight, link, image, table suite |

## Technical Notes

- Slash command positioning uses `editor.view.coordsAtPos(editor.state.selection.from)` to get cursor screen coordinates
- Force-directed graph runs physics for 120 frames then stops to save CPU; interaction (drag node) resumes physics
- Canvas drag uses pointer events with `onPointerDown/Move/Up` for smooth cross-device support
- Version snapshots debounced: only save if content hash differs from last saved version
- All Firestore writes use existing patterns from `firestoreSync.ts`
- No new npm packages beyond TipTap extensions (all UI is custom)
- Total estimated file count: ~12 new/modified files

