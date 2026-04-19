

# Massive Mobile Rebuild — Resources, Notes, Study, Focus, Admin

8 parallel tracks. Concise, high-impact only.

## Track A — Mobile Native Foundation (Flipkart-style)

**`src/components/MobileTopBar.tsx`** (new, reusable):
- Compact profile chip (avatar + name) tiny on top
- Below: search pill (full-width, 44px, rounded-22px)
- Below: horizontal scrollable nav chips (For You / Fashion-style — used by StudyOS for Calendar/Tasks/Habits/Focus/Analytics, by NotesOS for My/Public/Library)
- Auto-hide on scroll-down, restore on scroll-up (uses scroll direction hook)

**`src/hooks/useScrollDirection.ts`** (new): tracks scroll direction for hide/show top+bottom bars natively.

## Track B — Resources Page Full Mobile Rebuild

**`src/pages/Resources.tsx`** (mobile branch rewrite):
- Header: "Library" + search icon + 36px purple `+` add button
- Public/Private segmented switcher (gray bg, white sliding pill)
- Search bar (44px, always visible)
- Controls row: All Courses chip + All Categories chip + view toggle (list/grid)
- Grid view: 2-col cards with type icon, thumbnail, title, tags
- List view: 72px rows
- Edge-swipe-from-left → folder drawer

**`src/components/resources/FolderDrawer.tsx`** (new):
- 290px slide-in drawer with nested folder tree
- "+ New Folder" (admin in Public, all users in Private)
- Long-press → Rename/Move/Delete
- Persists last selected folder

**`src/components/resources/ResourceUploadSheet.tsx`** (new):
- 70vh bottom sheet, 6 type tiles (PDF/YouTube/Link/Doc/Image/Audio)
- Auto-fetch YouTube title/thumb on URL paste
- Subject/Course/Tags fields, purple Save button

**`src/components/resources/ResourceDetailSheet.tsx`** (new): inline preview + action row.

**`src/lib/resourcesFolders.ts`** (new): Firestore folder CRUD with parent/child tree.

**`src/lib/privateResources.ts`** (new): mirrors `notesLocalFS`/`notesFirestore` pattern — local FS or Firestore for private resources, with storage onboarding reusing `StorageOnboarding`.

## Track C — NotesOS Mobile (Obsidian-style)

**`src/pages/Notes.tsx`** (mobile rewrite):
- Top bar: hamburger (left) + workspace switcher pill (3-dot menu opens My/Public/Library) + read/edit toggle (right)
- Search bar centered between
- Auto-hide on scroll
- Bottom: existing MobileBottomNav
- When active note has `isCanvas:true` → render `<CanvasView readOnly={isPublicWorkspace && !isAdmin} />` else `<NoteEditor />`
- Sidebar pages with `isCanvas:true` show `LayoutDashboard` icon

**`src/components/notes/NotesSidebar.tsx`**: board icon for canvas pages (already added +Canvas button).

## Track D — StudyOS Mobile Top Bar Prune

**`src/pages/StudyMode.tsx`** (mobile branch):
- Top bar: hamburger + section title + view-toggle pill (Day/3-Day/Week)
- Remove Focus/Sync/Plan shortcuts (already in drawer)
- Single global FAB (`+`, 56px, purple) bottom-right above bottom nav
- Horizontal scrollable section chips (Calendar/Tasks/Habits/Focus/Analytics) — Flipkart-style

## Track E — Focus Mode Theme Picker + 5 Themes

**`src/lib/focusThemes.ts`** (extend): add 5 named themes (Lo-fi Room, Night City, Forest Morning, Minimal Dark, Warm Library) each with baseImage + overlays + audio + season variants (snow/rain/spring particles/summer dust).

**`src/components/focus/SceneEngine.tsx`** (extend): add seasonal particle effects (cherry blossom, autumn leaves, snow drift, summer fireflies).

**`src/components/focus/ThemePicker.tsx`** (new):
- Horizontal scrollable strip, 80×80 thumbnails
- Battery-safe toggle pill
- Cross-fade 400ms on switch
- Auto-dismiss after 5s idle

**`src/pages/FocusMode.tsx`**: wire ThemePicker into mode-selection screen + palette icon in active session.

**`src/components/focus/CustomThemeUpload.tsx`** (new): upload custom background, pick overlay (rain/particles/gradient/none).

## Track F — Admin Focus Mode Module

**`src/pages/Admin.tsx`** (add new section):
- "Focus Mode Manager" tab
- CRUD for themes: name, description, baseImage upload (Firebase Storage), overlay type, audio upload, video upload
- List of all themes with edit/delete/preview
- Stored in Firestore `focusThemes/{id}` — read by all users on focus session start

**`src/lib/adminFocusThemes.ts`** (new): Firestore CRUD for focus themes, syncs into local registry on app load.

**`src/components/admin/FocusThemeEditor.tsx`** (new): form with image/video/audio upload via existing `ImagePicker` + Firebase Storage upload helpers.

## Track G — Mobile Event Cards (no more giant web cards)

**`src/components/CalendarCreateModal.tsx`** (mobile branch): full-screen sheet with native pickers (TimeWheelPicker already exists), no desktop card.

**`src/components/CalendarEventPopover.tsx`** (mobile branch): bottom sheet 60vh instead of popover.

## Track H — Color System Audit (premium UX/UI palette)

**`src/index.css`**: Refine HSL tokens for Study OS specifically:
- New muted gradient backgrounds for sections
- Better contrast ratios (WCAG AA)
- Consistent purple primary (already #8B5CF6-ish), refined neutrals
- Add `--surface-elevated`, `--surface-recessed` tokens for proper hierarchy
- Apply to all StudyOS components

## Files (~22)

| File | Action |
|------|--------|
| `src/components/MobileTopBar.tsx` | New — Flipkart-style header |
| `src/hooks/useScrollDirection.ts` | New |
| `src/pages/Resources.tsx` | Mobile rewrite |
| `src/components/resources/FolderDrawer.tsx` | New |
| `src/components/resources/ResourceUploadSheet.tsx` | New |
| `src/components/resources/ResourceDetailSheet.tsx` | New |
| `src/lib/resourcesFolders.ts` | New |
| `src/lib/privateResources.ts` | New |
| `src/pages/Notes.tsx` | Mobile Obsidian shell + canvas render |
| `src/components/notes/NotesSidebar.tsx` | Board icon |
| `src/pages/StudyMode.tsx` | Mobile top bar prune + chip nav + FAB |
| `src/lib/focusThemes.ts` | 5 themes + seasonal variants |
| `src/components/focus/SceneEngine.tsx` | Seasonal particles |
| `src/components/focus/ThemePicker.tsx` | New |
| `src/components/focus/CustomThemeUpload.tsx` | New |
| `src/pages/FocusMode.tsx` | Wire picker |
| `src/pages/Admin.tsx` | Focus Mode Manager tab |
| `src/lib/adminFocusThemes.ts` | New Firestore CRUD |
| `src/components/admin/FocusThemeEditor.tsx` | New |
| `src/components/CalendarCreateModal.tsx` | Mobile full-screen sheet |
| `src/components/CalendarEventPopover.tsx` | Mobile bottom sheet |
| `src/index.css` | Color token refinement |

## Notes

- No new deps — Lottie/canvas particles are pure code
- Admin themes hydrate from Firestore on app boot, fall back to hardcoded 5
- Public canvas: readOnly only when `isPublicWorkspace && !isAdmin`. Private canvas always editable by owner.
- All mobile rebuilds are separate branches (not responsive) — desktop preserved
- Resources folders persisted in Firestore with parent/child IDs
- Auto-hide nav uses scroll direction (>10px delta threshold)

