

# Total UI Polish — Color System, Canvas Rebuild, Focus Page Overhaul, Floating Dock & Mobile Fixes

Massive scope. Splitting into independent parallel tracks. All ship in one pass.

## Track 0 — Build Errors (must fix first)

**`src/components/canvas/state/canvasStore.ts`**: Fix Jotai inference — `atom<Set<string>>(new Set<string>())`. Add `'hand'` to `Tool` union (currently missing → causes engine comparison error).

**`canvasEngine.ts`, `ContextMenu.tsx`, `MermaidEditor.tsx`, `TextEditor.tsx`**: Replace bare `new Set(...)` with `new Set<string>(...)` where setting `selectedIdsAtom`. Cast where needed. These are the cascading "never has no call signatures" errors.

## Track 1 — Color System Diagnosis & Unification

**Root cause**: `--sidebar-background`, `--card`, `--background`, `--os-bg`, `--surface-elevated` drift across pages. NotesSidebar uses `bg-card`, main body uses `bg-background`, StudyOS calendar uses hardcoded grays.

**`src/index.css`**:
- **Light mode**: collapse to 3 tones — bg `0 0% 100%`, card `250 14% 98%`, sidebar `250 14% 96%` (each 2% darker, single hue).
- **Dark mode**: bg `240 12% 6%`, card `240 10% 9%`, sidebar `240 10% 8%`. Single hue, monotonic.
- Unify `--os-bg` = `--background`, `--os-panel-bg` = `--card`. Kill divergence.
- Verify primary `263 70%` consistent both modes.

**Project sweep** — `src/pages/*` + `src/components/*`:
- `bg-white` → `bg-card` / `bg-background`
- `text-black` → `text-foreground`
- `bg-gray-{50-900}` → `bg-muted` / `bg-card` / `bg-secondary`
- Stray hex (`#1a1a2e`, `#7C3AED`, etc.) → token equivalents

**NotesSidebar + StudyOS panels**: explicit `bg-sidebar text-sidebar-foreground border-sidebar-border` everywhere. Same for the calendar shell.

## Track 2 — Canvas Module Total Rebuild

**Theme integration** — `VivaCanvas.tsx`:
- Replace hardcoded `#1a1a2e` background with `hsl(var(--background))`. 
- Pass `theme={resolvedTheme}` from `useTheme()` instead of forcing `'dark'`.
- Replace ALL `vc-*` CSS in `canvas.css` to consume tokens (`--vc-bg: hsl(var(--background))`, `--vc-text: hsl(var(--foreground))`, etc.). Both modes work.

**Precision fix** — `canvasEngine.ts` `getWorldPos`:
- Use `e.clientX/Y` against `canvas.getBoundingClientRect()` — verify devicePixelRatio scaling. `CanvasRenderer` must call `ctx.scale(dpr, dpr)` and set `canvas.width = rect.width * dpr` (currently likely scaled wrong, causing offset).
- Disable grid snap by default (you said "no dot detection"). Set `snapToGridAtom` default to `false`, `gridStyleAtom` default to `'none'`.

**Top toolbar drag handle** — `TopToolbar.tsx`:
- Add 6-dot grip icon at left, `framer-motion` `drag` with `dragConstraints` to viewport. Persist position to localStorage `vc_toolbar_pos`.

**Right sidebar theme match** — `RightSidebar.tsx`:
- Remove all custom backgrounds; use `bg-card border-border text-foreground`. Replace icon buttons with shadcn `Button variant="ghost" size="icon"`.

**Open canvas from Notes sidebar**:
- `Notes.tsx`: add `onClick={() => setViewMode('canvas')}` on the Canvas nav item. Currently the click handler is missing/broken.

**Wire add-to-page, export, library**:
- `LibraryPanel.tsx`: load from IndexedDB `canvasLibrary` table (already in `canvasDB.ts`). Currently empty array.
- `ExportModal.tsx`: implement PNG/SVG/JSON export via `canvas.toBlob`.
- `AddToPageModal.tsx`: capture canvas region as PNG, call `onAddToPage` prop (already plumbed).

## Track 3 — Focus Mode Page Total Redesign

**`src/pages/FocusMode.tsx`** — make it look like Dashboard/StudyOS (full-filled dashboard, not a tiny choose screen):

**Layout**: Hero section (today's focus minutes, streak, animated ring) · Quick-start cards (Strict / Normal — both ask duration via existing flow) · 3 picker rows (Themes · Music · Animations — each horizontal scroll showing 6 thumbnails + "View all") · Timer style picker row · Recent sessions table · Weekly heatmap · Total stats grid (4 tiles).

**Both buttons unified**: Strict and Normal both open the duration picker, not separate flows.

**Background image upload**: New "Custom Background" tile in theme picker → file input → `URL.createObjectURL` → save to IndexedDB → register as user theme.

**Music actually plays**: Bug — `audioRef.current.play()` never called when track changes. Fix in `MusicPicker` selection handler. Add `audio.crossOrigin = 'anonymous'`, handle promise rejection (autoplay policy), show "tap to play" if blocked.

**Animations actually render**: `SceneEngine.tsx` likely missing renderer for new animation IDs. Audit `focusAnimationLibrary.ts` IDs vs `SceneEngine` switch — add canvas/CSS renderers for all 20 entries (snow, rain, cherry, leaves, fireflies, dust, aurora, stars, meteor, bubbles, smoke, embers, fog, lightning, gradient-aurora, candle, ocean, galaxy, neon, none).

**Time tracking honesty**: `handleSessionComplete` records `totalSeconds`. Bug — also called on early exit. Fix: pass `actualSeconds = totalSeconds - remaining` to `saveFocusSession`. Show "Completed early — recorded X minutes" in complete screen.

## Track 4 — Floating Dock Bug + Maximize Height

**`FloatingDock.tsx`**:
- Click works "sometimes": likely `pointerdown` on drag handle conflicts with click. Add `dragMoved` flag — only treat as click if no drag delta > 5px.
- Maximize: when switching back to navbar mode, `Layout.tsx` must trigger window resize event so child pages (`Notes`, `StudyMode`) recompute `100dvh`. Add `window.dispatchEvent(new Event('resize'))` in `switchToNavbar`.

**Container height fix**: Notes/StudyMode pages use `h-[calc(100dvh-60px-...)]`. When dock mode is active, the navbar isn't present, so the calc is wrong. Use a single `--app-shell-offset` CSS var set by Layout (60px in navbar mode, 0 in dock mode) and consume it everywhere.

## Track 5 — Top Bar Cleanup

**`Layout.tsx`**:
- Remove `<DesktopAppButton />` from top bar (right of bell).
- Add "Download Desktop App" item inside profile dropdown menu (just above Sign Out).
- Remove the standalone `Minimize2` switch-to-dock button (it lives in the dropdown already).

## Track 6 — Dashboard Padding

**`src/pages/Dashboard.tsx`**: Wrap desktop content in `px-4 md:px-6 lg:px-8 py-6` consistently. Audit current — all 4 sides currently inconsistent.

## Track 7 — Mobile Top Bar (Flipkart-style) Universal Wire

**`src/components/MobileTopBar.tsx`** already exists. Wire it into Notes, Study, Resources mobile branches. Replace the broken `MobilePageHeader` instances. Ensure auto-hide via `useScrollDirection`. Hamburger opens left `MobileSheet`. Profile chip + search pill + horizontally scrollable section chips.

**Mobile actions broken**: audit each mobile page — every chip/button needs an `onClick` wired to the existing handler. Currently UI renders but handlers are no-ops.

## Track 8 — Mobile Resources Public/Private Toggle

`Resources.tsx` already has it on mobile per Track A earlier — verify it's still wired and visible above the search pill on `< md` breakpoints.

## Track 9 — Pull-to-Refresh

Wire `usePullToRefresh` (already built) into `Resources.tsx` and the mobile branch of `StudyMode.tsx` — match the rubber-band spinner used on Dashboard.

## Track 10 — Profile Dropdown Profile Link Bug

`Layout.tsx` mobile bottom nav "Me" → `/profile`. Verify route exists in `App.tsx` and `Profile.tsx` doesn't redirect. Currently goes to calendar — likely a misordered route or a `<Navigate>` inside Profile.

## Files (~24, all parallel)

| File | Action |
|---|---|
| `src/components/canvas/state/canvasStore.ts` | Fix `Set<string>` typing, add `'hand'` Tool, default snap off |
| `src/components/canvas/elements/types.ts` | Add `'hand'` to Tool union |
| `src/components/canvas/engine/canvasEngine.ts` | Type fixes, DPR-aware coordinate mapping |
| `src/components/canvas/components/ContextMenu.tsx` | `new Set<string>()` |
| `src/components/canvas/components/MermaidEditor.tsx` | `new Set<string>()` |
| `src/components/canvas/components/TextEditor.tsx` | `new Set<string>()` |
| `src/components/canvas/components/CanvasRenderer.tsx` | DPR scaling, theme-aware bg |
| `src/components/canvas/components/TopToolbar.tsx` | Drag handle + persist position |
| `src/components/canvas/components/RightSidebar.tsx` | Token-based styling |
| `src/components/canvas/components/LibraryPanel.tsx` | Load from IndexedDB |
| `src/components/canvas/components/ExportModal.tsx` | Real PNG/SVG/JSON export |
| `src/components/canvas/VivaCanvas.tsx` | Pass resolvedTheme, token bg |
| `src/components/canvas/canvas.css` | Replace all colors with tokens |
| `src/index.css` | Unify sidebar/card/bg tones, both modes |
| `src/pages/FocusMode.tsx` | Dashboard-like layout, custom bg upload, accurate time tracking |
| `src/components/focus/MusicPicker.tsx` | Fix audio play |
| `src/components/focus/SceneEngine.tsx` | Implement all 20 animations |
| `src/components/FloatingDock.tsx` | Click-vs-drag fix, height-restore event |
| `src/components/Layout.tsx` | Remove top desktop-app button, add to profile menu, app-shell-offset var |
| `src/pages/Dashboard.tsx` | Padding cleanup |
| `src/pages/Notes.tsx` | Wire MobileTopBar, fix Canvas nav click |
| `src/pages/StudyMode.tsx` | Wire MobileTopBar, pull-to-refresh |
| `src/pages/Resources.tsx` | Wire pull-to-refresh, verify public/private toggle |
| `src/pages/Profile.tsx` | Audit for route hijack |

## Approach

- Build errors fixed first (everything else depends on the canvas compiling)
- Color sweep is mostly find-and-replace — small per-file diffs
- Canvas precision fix is concentrated in 2 files (engine + renderer DPR)
- All 10 tracks ship in one parallel pass
- No new deps

## Out of scope (explicit)

- Three.js / WebGL canvas rewrite (current 2D canvas is fine — just needs DPR fix)
- New mobile pages beyond what already exists
- Backend changes

