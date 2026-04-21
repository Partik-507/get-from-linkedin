

# Final Polish Pass — Color Unification, Mobile-Native, Animated Profile, Focus Dashboard, Native Packaging

All 8 tracks ship in one parallel pass. Independent, no blocking.

## Track 1 — Color System Unification & Sweep

**`src/index.css`** — collapse to single-hue monotonic palette:
- **Light**: `--background 0 0% 100%` · `--card 250 14% 98%` · `--sidebar-background 250 14% 96%` · `--muted 250 14% 94%`
- **Dark**: `--background 240 12% 6%` · `--card 240 10% 9%` · `--sidebar-background 240 10% 8%` · `--muted 240 10% 12%`
- Unify `--os-bg` → `--background`, `--os-panel-bg` → `--card`. Kill all drift.
- Default theme: **light** (per request)

**Project-wide sweep** across `src/pages/*` + `src/components/*`:
- `bg-white` → `bg-card` / `bg-background`
- `text-black` → `text-foreground`
- `bg-gray-{50-900}` → `bg-muted` / `bg-secondary` / `bg-card`
- Stray hex (`#1a1a2e`, `#7C3AED`, `#fff`, etc.) → token equivalents
- StudyOS calendar shell, NotesSidebar, sidebars: explicit `bg-sidebar text-sidebar-foreground border-sidebar-border`
- Verify dark-mode contrast on every page

## Track 2 — FocusMode Total Redesign

**`src/pages/FocusMode.tsx`** — full dashboard layout:
- **Hero row**: today's minutes ring · streak · weekly total · best session
- **Quick start**: Strict + Normal cards (both → existing duration picker)
- **3 inline picker rows**: Themes / Music / Animations (horizontal scroll, 6 thumbs + "View all")
- **Timer style picker** row
- **Custom background upload** tile in Themes → file input → IndexedDB → registers as user theme
- **Recent sessions** table + **weekly heatmap** + **4 stat tiles**
- **Accurate exit tracking**: `actualSeconds = totalSeconds - remaining`, save real elapsed on early exit, show "Recorded X min (early exit)" toast

**`src/components/focus/SceneEngine.tsx`** — implement all 20 animations (snow, rain, cherry, leaves, fireflies, dust, aurora, stars, meteor, bubbles, smoke, embers, fog, lightning, gradient-aurora, candle, ocean, galaxy, neon, none) via canvas particle systems + CSS gradients.

**`src/components/focus/MusicPicker.tsx`** — fix autoplay: `audio.crossOrigin='anonymous'`, await `play()`, catch rejection, show "Tap to play" fallback.

## Track 3 — Canvas Polish

**`src/components/canvas/components/TopToolbar.tsx`**:
- Add 6-dot grip icon (left), `framer-motion drag` with viewport constraints
- Persist `{x,y}` to `localStorage('vc_toolbar_pos')`, hydrate on mount

**`src/components/canvas/components/RightSidebar.tsx`**:
- Strip all custom backgrounds → `bg-card border-border text-foreground`
- Replace icon buttons with shadcn `<Button variant="ghost" size="icon">`
- Section headers use `text-muted-foreground text-xs uppercase tracking-wide`

## Track 4 — Mobile-Native Reconstruction (NotesOS / StudyOS / Resources / Dashboard)

**Wire `MobileTopBar` everywhere** — replace web-extended headers on mobile:
- `src/pages/Notes.tsx` mobile branch: hamburger (left drawer with file tree) · profile chip · search pill · chips [Pages·Canvas·Graph·Library]
- `src/pages/StudyMode.tsx` mobile branch: hamburger · profile · search · chips [Calendar·Tasks·Habits·Focus·Analytics]
- `src/pages/Resources.tsx` mobile branch: hamburger · profile · search · chips [All·Notes·PDFs·Videos·Links] + **public/private toggle pill above search**
- `src/pages/Dashboard.tsx` mobile: rebuild greeting card with native iOS-style "Start your day" CTA (replace broken web-extension)
- All headers: auto-hide on scroll-down via `useScrollDirection`

**Wire `usePullToRefresh`** into `Resources.tsx` and StudyMode mobile content area (rubber-band spinner matching Dashboard).

**Mobile action handlers**: audit every chip/button → ensure real `onClick` handlers wired (currently many are no-ops).

## Track 5 — Resources Web: Sidebar + Public/Private Toggle

**`src/pages/Resources.tsx`** desktop branch:
- Add **left sidebar** matching NotesSidebar pattern (`bg-sidebar`, same width, same chevron treatment)
- Sidebar shows **nested folder tree** (folders within folders, infinite depth) using existing `resourcesFolders` lib
- Click folder → **instant filter** (no search step)
- Right-click / long-press → create sub-folder, rename, delete
- **Public/Private toggle pill** at top of sidebar (segmented control), same on mobile
- Folder tree drag-and-drop reordering (later, scoped out for now)

## Track 6 — Top Navbar Cleanup + Animated Profile Avatar

**`src/components/Layout.tsx`**:
- **Remove** sync indicator (the green-dot "Synced 2/20" pill)
- **Remove** standalone notification bell from top bar
- **Move** notifications + sync status into profile dropdown menu
- **Remove** breadcrumb completely from top nav (logo only on left)
- **Keep** Focus Mode icon + Full-Screen icon on top nav (per your confirmation)
- Dropdown order: Animated Avatar → name/email · Notifications · Sync status · Theme toggle · Download Desktop App · Switch to Dock · Sign Out

**`src/components/AnimatedAvatar.tsx`** (new) — pure SVG/CSS smiley:
- Round face (gradient `from-primary to-purple-500`)
- Two SVG eyes — periodic blink animation (`animate-[blink_4s_infinite]`)
- Mouth that morphs between smile / open-smile / smirk every 6s (SVG path interpolation via CSS `d` keyframes)
- No nose
- 32px in navbar, 64px in profile dropdown header
- Accessible: `aria-label="Profile"`, respects `prefers-reduced-motion`

## Track 7 — FloatingDock Polish

**`src/components/FloatingDock.tsx`**:
- Increase **width** from current ~180px → **260px** (more visible)
- Increase **opacity** from `bg-card/70` → `bg-card/90` with stronger backdrop-blur
- Keep height as-is
- Fix click-vs-drag: 5px deadzone (already partially in place — verify)

## Track 8 — Native Packaging Diagnosis (Desktop + Mobile)

This is **diagnosis + setup guide**, not full packaging in this pass (requires user-side native toolchain).

**Desktop (Electron, Windows/Mac/Linux, offline)**:
- Set `base: './'` in `vite.config.ts` (required for `file://` loading)
- Add `electron/main.cjs` with `BrowserWindow` loading `dist/index.html`
- Install `electron` + `@electron/packager` as devDeps
- Add npm scripts: `electron:build`, `electron:package:win`, `electron:package:mac`
- IndexedDB-based offline already in place (notes, focus assets, canvas)
- Document: user runs `npm run electron:package:win` on Windows to produce `.exe`

**Mobile (Capacitor → Play Store / App Store)**:
- Install `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/ios`
- `capacitor.config.ts` with appId `app.lovable.04520665efff45e69c707c0c38ad61d2`
- Hot-reload server URL configured for sandbox preview
- Document export-to-GitHub flow + `npx cap add android/ios` + `npx cap sync` workflow
- Service worker (`public/sw.js`) already provides offline caching → mobile app works offline

Add a new **`docs/PACKAGING.md`** with step-by-step instructions for both targets.

## Files (~28, all parallel)

| File | Action |
|---|---|
| `src/index.css` | Unified palette, light default |
| `src/contexts/ThemeContext.tsx` | Default `"light"` (already) |
| Project sweep (~12 files) | Token replacement |
| `src/pages/FocusMode.tsx` | Dashboard redesign + bg upload + accurate timing |
| `src/components/focus/SceneEngine.tsx` | All 20 animations |
| `src/components/focus/MusicPicker.tsx` | Autoplay fix |
| `src/components/canvas/components/TopToolbar.tsx` | Drag handle + persist |
| `src/components/canvas/components/RightSidebar.tsx` | Token-based shadcn |
| `src/pages/Notes.tsx` | MobileTopBar wiring |
| `src/pages/StudyMode.tsx` | MobileTopBar + PTR |
| `src/pages/Resources.tsx` | MobileTopBar + PTR + desktop sidebar + folder tree |
| `src/pages/Dashboard.tsx` | Mobile greeting rebuild |
| `src/components/resources/ResourcesSidebar.tsx` | New (mirrors NotesSidebar) |
| `src/components/Layout.tsx` | Cleanup + dropdown reorg + AnimatedAvatar |
| `src/components/AnimatedAvatar.tsx` | New SVG/CSS smiley |
| `src/components/FloatingDock.tsx` | Wider, more opaque |
| `vite.config.ts` | `base: './'` |
| `electron/main.cjs` | New |
| `capacitor.config.ts` | New |
| `package.json` | Electron + Capacitor scripts/deps |
| `docs/PACKAGING.md` | New guide |

## Approach

- All 8 tracks ship in one parallel pass — no "next message"
- AnimatedAvatar pure SVG + CSS (no new deps, respects `prefers-reduced-motion`)
- Native packaging: configs + docs in this pass; user runs the OS-specific commands locally
- Color sweep is mechanical find-and-replace
- Desktop preserved everywhere; mobile branches purpose-built

## Out of scope

- Actually building `.exe` / `.apk` binaries (requires user-side Windows/Android Studio)
- Three.js canvas rewrite
- Backend schema changes

