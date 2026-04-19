

# Mobile-Native Total Reconstruction — Bottom Nav, Flipkart Header, Obsidian Notes, Native Study, Dashboard Parity

Full ground-up rebuild. No web responsiveness. Real native patterns.

## Track 1 — Bottom Nav (the foundational fix)

**`src/components/MobileBottomNav.tsx`** — full rewrite:
- 6 slots: Home · Study · **[+ FAB]** · Notes · Resources · Me
- FAB is **absolutely positioned** at center (not a flex child) → never moves on tap
- Single premium purple gradient (no rainbow), 56px, raised 12px, soft purple glow
- Active state: small 4px purple dot under icon (no pill jiggle)
- Tap feedback: opacity only, no scale on FAB (kills the "moving" bug)
- Render on **every** route including `/notes` (fix Layout's `hideBottomNav` for mobile)
- "Me" → `/profile` (currently broken)

**`src/components/QuickActionSheet.tsx`** — recolor:
- All tiles use **single purple→indigo gradient** (premium, not multicolor)
- Glass surface variant for secondary tiles
- Icon-first layout, label below, consistent 96px tiles

## Track 2 — Universal Mobile Header (Flipkart pattern)

**`src/components/MobileTopBar.tsx`** (new) — replaces top navbar everywhere on mobile:
- **Row 1**: hamburger (left) · "Hi, [Name]" + tiny avatar (center-left) · notification bell (right)
- **Row 2**: full-width search pill (44px, rounded-22, our purple focus ring)
- **Row 3**: horizontal scrollable section chips (page-specific)
- Auto-hide on scroll-down, reveal on scroll-up (`useScrollDirection`)
- Hamburger opens left drawer (`MobileSheet` from-left variant)

**`src/components/Layout.tsx`**: on mobile, render `MobileTopBar` instead of desktop navbar. Kill the old top header on every page.

## Track 3 — StudyOS Mobile Reconstruction

**`src/pages/StudyMode.tsx`** mobile branch:
- `MobileTopBar` with chips: Calendar · Tasks · Habits · Focus · Analytics
- Remove all in-page headers, view-toggle pills, duplicate controls
- Full-bleed content area
- Section state synced to URL hash for back-button
- All "create" actions flow through bottom-nav `+` FAB → `QuickActionSheet`

**`src/components/CalendarCreateModal.tsx`**: remove `TimeWheelPicker` from event creation (it's a timer, not a time picker — your confusion was right). Use native `<input type="datetime-local">` on mobile inside `MobileSheet snap="full"`.

**`src/components/CalendarEventPopover.tsx`**: mobile → `MobileSheet snap="half"` with native action rows (Edit · Delete · Share), no web popover styling.

## Track 4 — NotesOS Obsidian Reconstruction

**`src/pages/Notes.tsx`** mobile rewrite:
- `MobileTopBar` chips: Pages · Canvas · Graph · Library
- Search pill searches notes
- Hamburger opens **left sidebar drawer** (file tree, exactly like Obsidian)
- Bottom nav stays visible (fix Layout's `hideBottomNav` mobile override)

**`src/components/notes/MobileNoteHeader.tsx`** (new) — when a note is open:
- Left: drawer-icon (square outline, like your Obsidian screenshot)
- Center: empty / breadcrumb
- Right: read-mode toggle (book icon) + 3-dot menu
- Auto-hides on scroll, returns on scroll-up
- Matches your screenshot exactly

**`src/components/notes/NoteEditor.tsx`** mobile:
- Hide all in-page toolbars by default (clean blank canvas)
- Detect `visualViewport` resize → keyboard open → render **floating toolbar above keyboard** (this is called a **keyboard accessory bar / input accessory view**)
- Toolbar contains: undo · redo · `[]` (link) · page · tag · attach · H · B · I · S · highlight · `</>`
- Position: `bottom: keyboardHeight`, glass background, horizontally scrollable
- 3-dot menu in `MobileNoteHeader` reveals secondary actions

## Track 5 — Dashboard Mobile (parity + native)

**`src/components/dashboard/MobileDashboard.tsx`** — extend:
- Keep current 4 native rows (greeting, streak, today's plan, quick actions)
- **Add missing web parity**:
  - Recent activity (last 5 events from web)
  - Active courses widget (from web)
  - Engagement heatmap (compact mobile version)
  - Notifications preview (3 latest)
  - Spaced-repetition due cards count
- Pull-to-refresh (rubber-band, top of scroll)

## Track 6 — Pull-to-Refresh

**`src/hooks/usePullToRefresh.ts`** (new):
- Touchstart at scrollTop=0, track pull distance
- Rubber-band easing (resistance curve)
- Trigger at 80px, snap back, native spinner
- Wire into Dashboard + Resources

## Track 7 — FocusHub Polish

**`src/components/focus/FocusHub.tsx`**:
- First-time pulsing ring around hub (localStorage flag `focus_hub_seen`)
- Auto-hide after 3 sessions

**`src/contexts/FocusContext.tsx`**:
- Persist `timerStyle` + `selectedMusic` + `selectedAnimation` to Firestore `userPrefs/{uid}/focus`
- Hydrate on auth ready

## Track 8 — Color Token Sweep

Search & replace across `src/pages/*` and `src/components/*`:
- `bg-white` → `bg-background` / `bg-card`
- `text-black` → `text-foreground`
- `bg-gray-*`, hex codes, `rgb()` → semantic tokens
- Verify dark-mode contrast on every page

## Track 9 — Profile Mobile-Native

**`src/pages/Profile.tsx`** mobile:
- iOS-style grouped list rows (Account · Theme · Storage · Notifications · Sign Out)
- 56px rows, chevron-right, section headers
- Avatar header with edit pencil

## Track 10 — Layout Fixes

**`src/components/Layout.tsx`**:
- Force `MobileBottomNav` on **all** routes when mobile (kill `hideBottomNav` on mobile)
- Force `MobileTopBar` instead of desktop nav
- Ensure `pb-[88px]` content padding for nav clearance

## Files (~22, parallel)

| File | Action |
|---|---|
| `src/components/MobileBottomNav.tsx` | Rewrite (6 slots, absolute FAB) |
| `src/components/QuickActionSheet.tsx` | Single-purple gradient |
| `src/components/MobileTopBar.tsx` | New universal header |
| `src/components/Layout.tsx` | Mobile shell wiring |
| `src/pages/StudyMode.tsx` | Mobile reconstruction |
| `src/pages/Notes.tsx` | Mobile reconstruction |
| `src/components/notes/MobileNoteHeader.tsx` | New Obsidian header |
| `src/components/notes/NoteEditor.tsx` | Keyboard accessory toolbar |
| `src/components/CalendarCreateModal.tsx` | Native datetime, MobileSheet |
| `src/components/CalendarEventPopover.tsx` | MobileSheet half |
| `src/components/dashboard/MobileDashboard.tsx` | Web parity widgets |
| `src/hooks/usePullToRefresh.ts` | New |
| `src/pages/Dashboard.tsx` | Wire PTR |
| `src/pages/Resources.tsx` | Wire PTR + token sweep |
| `src/pages/Profile.tsx` | iOS list rebuild |
| `src/components/focus/FocusHub.tsx` | First-time hint |
| `src/contexts/FocusContext.tsx` | Firestore prefs sync |
| `src/index.css` | Token additions |
| Misc pages | Token sweep |

## Approach

- All tracks ship in one parallel pass
- No new deps (visualViewport, framer-motion, native inputs cover everything)
- Desktop preserved via `md:` branches
- Bottom nav guaranteed on every mobile route
- Keyboard accessory toolbar = standard iOS/Android pattern (`window.visualViewport.height` delta)

