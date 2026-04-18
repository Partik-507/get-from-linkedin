

# Massive Mobile + Share + Canvas Admin + Focus Room Rebuild

5 parallel tracks. Concise, high-impact only.

## Track A — Mobile Calendar/Notes/Layout fixes

**`src/components/Layout.tsx`**: Hide top navbar on mobile entirely (`hidden md:flex`). Mobile uses bottom nav only.

**`src/components/CalendarView.tsx`**: 
- Mobile (`<md`): force `view="day"` default, render only `MobileDayView`, full-bleed (no border/padding/card wrapper), hide all view-switcher chips/shortcuts (already in drawer)
- Wire MobileDayView into day branch on mobile

**`src/pages/StudyMode.tsx`**: Mobile top bar = single hamburger + title + FAB. Remove duplicate shortcuts (keep only in drawer).

**`src/pages/Notes.tsx`**: Mobile = no top navbar (Layout handles), full-bleed editor, edge-swipe-from-left opens sidebar drawer.

## Track B — FloatingDock (Command Center) hard fixes

**`src/components/FloatingDock.tsx`**:
- Fix slab toggle race: single `mode: "expanded" | "slab"` state, never both
- Slab click handler: stopPropagation + explicit `setMode("expanded")` 
- When in slab mode: container `height: auto`, `width: auto`, no fixed dimensions leaking from expanded state — clear inline styles on collapse
- Pointer-events: slab `auto`, expanded panel `auto`, never `none` blocking
- Persist `mode` in localStorage so reload keeps state
- Slab visibility: always `opacity ≥ 0.15`, never display:none

## Track C — Public Share System (`/share/:shareId`)

**`src/pages/SharedNote.tsx`** → rename mentally to `SharedView.tsx`, generalize:
- Read `shareId` from URL
- Query Firestore `publicShares/{shareId}` (already used by `ShareModal`)
- Detect `type` (`note` | `canvas`) from doc
- Render note → read-only TipTap (or sanitized HTML)
- Render canvas → CanvasView with `readOnly={true}`
- Top banner: "You're viewing a shared page (read-only)" + "Open in workspace" if logged in
- Edge cases: invalid → "Not Found", deleted (`deleted:true`) → "No longer available", `revoked:true` → blocked
- No auth required (route stays outside AuthGate ✅ already)

**`src/App.tsx`**: Add `/share/:shareId` route → `<SharedView />` (keep `/shared/:noteId` as alias for legacy).

**`src/components/notes/ShareModal.tsx`**: Already writes to `publicShares/{slug}` ✅. Add `type: "note" | "canvas"` field, `revoked: false`, view counter increment on read.

**`src/components/notes/CanvasView.tsx`**: Accept `readOnly` prop — disable drag/zoom-pan still allowed but no node creation/edit/delete.

## Track D — Admin Canvas Creation in NotesOS

**`src/pages/Notes.tsx`** + **`src/components/notes/NotesSidebar.tsx`**:
- Add "+ New Canvas" button (admin only, via `useAuth().isAdmin`) next to "+ New Page"
- Creates note with `isCanvas: true`, `title: "Untitled Canvas"`, icon `🎨`
- Sidebar: pages with `isCanvas:true` show board icon (Layout/Grid icon)
- Notes.tsx render: if active page `isCanvas` → `<CanvasView readOnly={!isAdmin && isPublicWorkspace} />` else `<NoteEditor />`

## Track E — Offline Focus Room Engine

**`src/lib/focusThemes.ts`** (new) — Theme registry:
```
{ id, name, baseImage, overlays: [{type:'snow'|'rain'|'particles'|'glow', config}], audio: {url, label}, perfProfile }
```

**`src/components/focus/SceneEngine.tsx`** (new):
- Layered renderer: `<img>` base + `<canvas>` overlay (requestAnimationFrame loop)
- Particle systems: snow (gravity+drift), rain (linear+splash), floating dust (sine), glow (radial gradient pulse)
- 60fps target, auto-throttle to 30fps if frame budget exceeded
- Battery-safe mode: pause canvas, keep static image only

**`src/components/focus/AudioEngine.tsx`** (new):
- Preloads MP3 to Cache Storage on first play
- HTMLAudio with `loop`, crossfade between tracks (200ms)
- Volume slider, mute toggle, falls back to silent if blob fails

**`src/lib/focusAssetCache.ts`** (new):
- `cacheAsset(url)` → fetch + put in `focus-assets-v1` Cache Storage, return blob URL
- `getCachedAsset(url)` → returns local blob URL if present, else fetches+caches

**`src/pages/FocusMode.tsx`**: 
- Replace any video bg with `<SceneEngine theme={selected} />`
- Theme picker drawer (Night Desk, Rainy Window, Anime Study, Library, Cafe)
- Mode toggle: Normal / Strict / Battery-Safe
- Minimal UI: timer, clock, controls, volume, theme — auto-hide after 3s idle

**Theme assets**: Use 5 royalty-free Unsplash URLs as initial baseImage (cached on first load); animations are pure code so no asset weight.

## Files (~12)

| File | Action |
|------|--------|
| `src/components/Layout.tsx` | Hide top navbar on mobile |
| `src/components/CalendarView.tsx` | Mobile = day-only, full-bleed |
| `src/pages/StudyMode.tsx` | Strip mobile shortcuts |
| `src/pages/Notes.tsx` | Mobile shell + canvas creation |
| `src/components/notes/NotesSidebar.tsx` | Board icon, +Canvas button |
| `src/components/notes/CanvasView.tsx` | readOnly prop |
| `src/components/FloatingDock.tsx` | Slab toggle hard fix |
| `src/pages/SharedNote.tsx` | Generalize to note+canvas viewer |
| `src/App.tsx` | `/share/:shareId` route |
| `src/components/notes/ShareModal.tsx` | type field, revoke |
| `src/lib/focusThemes.ts` | New |
| `src/lib/focusAssetCache.ts` | New |
| `src/components/focus/SceneEngine.tsx` | New |
| `src/components/focus/AudioEngine.tsx` | New |
| `src/pages/FocusMode.tsx` | Wire scene engine |

## Notes

- No new deps (canvas particles + HTMLAudio are native)
- All desktop layouts preserved
- Share route works without auth (already outside AuthGate)
- FloatingDock localStorage key: `dock_mode` separate from size/pos to prevent state corruption

