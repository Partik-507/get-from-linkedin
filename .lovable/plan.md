

# ITM Hub — Offline-First Platform + Mobile Rebuild + ImagePicker + Theme Audit

Massive scope. Building everything in one pass. Grouping into 4 parallel tracks.

## Track A — Offline-First Architecture

**`public/sw.js`** (rewrite) — Real service worker with Workbox-style strategies:
- Precache app shell (HTML, JS, CSS, icons) on install
- Network-first for Firestore/Auth, cache-first for static assets
- Separate cache for downloaded PDFs/docs (`itm-files-v1`)
- Skip cache for `/oauth`, `/api/*`

**`src/lib/offlineDB.ts`** (new) — IndexedDB wrapper, per-user namespacing:
- DB name: `itm_hub_${userId}` — completely isolated per user
- Stores: `questions`, `answers`, `resources`, `notes`, `progress`, `bookmarks`, `manifest`, `syncQueue`, `fileBlobs`
- Methods: `put`, `get`, `getAll`, `query(index)`, `bulkPut`, `clearStore`

**`src/lib/syncEngine.ts`** (new) — Smart sync orchestrator:
- `fetchManifest(userId)` — pulls allowed content list with versions/hashes from Firestore
- `syncContent(manifest)` — diffs local vs remote, only downloads changed items
- `downloadFile(url, hash)` — fetches PDF/doc, stores blob in Cache Storage, dedupes by hash
- `queueEdit(op)` — append offline mutation to `syncQueue`
- `flushQueue()` — when online, replay queued ops to Firestore
- Background sync via `requestIdleCallback`

**`src/contexts/OfflineContext.tsx`** (new) — Global offline state:
- `isOnline`, `lastSyncAt`, `syncProgress`, `isOfflineReady`
- Triggers initial sync on first login, polls online status
- Exposes `triggerSync()`, `downloadForOffline(fileId)`

**`src/components/OfflineIndicator.tsx`** (new) — Status pill in top bar:
- Green dot "Synced 2m ago" / Orange "Offline — viewing cached" / Blue spinner "Syncing 12/40"

**`src/lib/localSearch.ts`** (new) — Fuse.js-powered local search across IndexedDB stores (already have Fuse).

**`src/components/PDFViewer.tsx`** (new) — Full-window PDF viewer:
- Loads from Cache Storage if available, else fetches + caches
- Exit button (top-left), download/print actions
- Uses native `<iframe>` with blob URL (zero deps)

**`src/contexts/AuthContext.tsx`** (edit) — Persist auth locally:
- Cache user object in IndexedDB so reload works offline
- Skip Firebase re-auth if cached session valid

## Track B — Mobile-Native Rebuild Pass

**`src/pages/Notes.tsx` + `src/components/notes/NoteEditor.tsx`** — Mobile sticky bottom toolbar (Bold, Italic, H1, List, Link, Image, Slash), 44px buttons, sidebar collapsed by default with swipe-right reveal.

**`src/components/CalendarView.tsx`** — Force vertical day-view on mobile (single column, hourly slots, tap-to-create), hide week/month grids under `md:`.

**`src/pages/Dashboard.tsx`** — 2×2 metric grid, horizontal-scroll course progress, vertical activity feed.

**`src/pages/Resources.tsx`** — Sticky course filter chip row, single-column resource cards, FAB for admin add.

**`src/pages/Index.tsx`** — Vertical hero, sticky filter chips, single-column course list.

**`src/pages/Auth.tsx`** — Full-screen mobile, h-12 inputs, large CTAs.

**`src/pages/Quiz.tsx` + `src/pages/Flashcards.tsx`** — Swipe-left/right nav, full-screen layouts.

**`src/index.css`** — Remove all `:hover` dependencies via `@media (hover: none)` overrides, force `active:` states.

## Track C — Unified ImagePicker

**`src/lib/imageUtils.ts`** (new):
- `compressImage(file, {maxWidth, quality, format})` — Canvas-based, no deps
- `convertFormat(blob, "webp"|"jpg"|"png")` — Canvas `toBlob`
- `uploadToFirebase(blob, path)` — wraps existing storage SDK
- `uploadToLocalFS(blob, dirHandle, name)` — uses File System Access API

**`src/components/ImagePicker.tsx`** (new):
- Props: `value`, `onChange(url)`, `readOnly`, `bucket`, `maxSizeMB`, `aspectRatio?`
- UI: drop zone + click-to-browse + preview + replace/delete (admin only)
- Format dropdown: Auto / JPG / PNG / WebP
- Auto-compresses >2000px down with quality 0.85
- Storage routing: respects `useStorage()` mode (local vs cloud)
- Admin-only edit/delete; non-admins see read-only preview

**Wire into**: `CourseCard.tsx`, `NoteEditor.tsx` (slash command), `Resources.tsx` add modal, `Profile.tsx` avatar.

## Track D — Theme Audit

Scan all pages for `bg-white`, `bg-gray-*`, `text-black`, `text-white` and replace with semantic tokens (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`). Keep PDF iframe `bg-white` (PDFs need it) but add `dark:bg-neutral-100` wrapper.

## Files (~30)

| File | Action |
|------|--------|
| `public/sw.js` | Rewrite — full service worker |
| `src/lib/offlineDB.ts` | New — per-user IndexedDB |
| `src/lib/syncEngine.ts` | New — smart sync |
| `src/lib/localSearch.ts` | New — Fuse-based |
| `src/lib/imageUtils.ts` | New — compression/conversion |
| `src/contexts/OfflineContext.tsx` | New |
| `src/contexts/AuthContext.tsx` | Edit — local session cache |
| `src/components/OfflineIndicator.tsx` | New |
| `src/components/PDFViewer.tsx` | New — full-window viewer |
| `src/components/ImagePicker.tsx` | New |
| `src/components/ResourceViewer.tsx` | Edit — use PDFViewer |
| `src/components/CourseCard.tsx` | Wire ImagePicker (admin) |
| `src/components/notes/NoteEditor.tsx` | Mobile toolbar + ImagePicker |
| `src/components/CalendarView.tsx` | Vertical day-view mobile |
| `src/pages/Notes.tsx` | Mobile sidebar/swipe |
| `src/pages/Resources.tsx` | Sticky filter + theme audit |
| `src/pages/Dashboard.tsx` | Mobile stack + theme audit |
| `src/pages/Index.tsx` | Mobile hero + theme audit |
| `src/pages/Auth.tsx` | Full-screen mobile |
| `src/pages/Quiz.tsx` | Swipe nav |
| `src/pages/Flashcards.tsx` | Swipe nav |
| `src/pages/Profile.tsx` | ImagePicker for avatar + theme audit |
| `src/pages/Admin.tsx` | Theme audit |
| `src/main.tsx` | Register SW, wrap OfflineProvider |
| `src/App.tsx` | Add OfflineProvider |
| `src/index.css` | Hover-none overrides |

## Notes

- No new deps — Fuse.js already installed, image compression uses native Canvas
- Service worker only registers in production (skips Lovable preview iframe per PWA rules)
- Per-user IndexedDB namespacing prevents data leakage between accounts
- Sync queue persists across reloads, replays on reconnect
- All file downloads dedupe by SHA-256 hash to save bandwidth/storage

