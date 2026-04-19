

# Mobile-Native Total Rebuild — StudyOS, NotesOS, Focus Immersion, Dashboard, Calendar

You loved Resources mobile. Same energy across the entire app. One parallel pass.

## Track A — StudyOS Mobile (full native rebuild)

**`src/pages/StudyMode.tsx`** mobile branch (`md:hidden`):
- **Header (auto-hide on scroll)**: hamburger (drawer) + "Study" title + view-toggle pill (Day / 3-Day / Week)
- **Section chips row (horizontal scroll)**: Calendar · Tasks · Habits · Focus · Analytics — Flipkart-style, active pill animates
- **Content area**: full-bleed, no card wrappers, native list rows
- **Global FAB**: 56px purple `+` bottom-right above bottom nav → opens `QuickActionSheet` (New Task / New Event / Quick Focus / New Habit)
- All shortcuts removed from header (live in drawer + FAB)

**`src/components/study/QuickActionSheet.tsx`** (new): MobileSheet with 4 large action tiles.

**`src/components/study/MobileTaskRow.tsx`** (new): 64px row, swipe-left to complete, swipe-right to defer.

**`src/components/study/MobileHabitGrid.tsx`** (new): native check tiles, haptic-style scale.

## Track B — NotesOS Mobile (Obsidian shell)

**`src/pages/Notes.tsx`** mobile rewrite:
- **Top bar**: hamburger (sidebar drawer) + workspace switcher pill (3-dot menu → My / Public / Library) + read/edit toggle
- **Below top bar**: centered search pill (44px)
- **Content**: full-bleed editor, auto-hide top + bottom nav on scroll-down
- **Sidebar** opens as `MobileSheet snap="full"` (left-edge swipe or hamburger)
- **Workspace switcher**: 3-dot opens MobileSheet with 3 options + active checkmark
- Canvas pages render `<CanvasView readOnly={isPublicWorkspace && !isAdmin} />`

**`src/components/notes/MobileNoteHeader.tsx`** (new): the Obsidian shell.

## Track C — Focus Immersion Engine (the big one)

### Floating Control Hub
**`src/components/focus/FocusHub.tsx`** (new) — replaces scattered top-bar controls:
- Single floating circular button (56px, glass, bottom-center above safe area)
- Tap → radial menu fans out 5 options: 🎨 Theme · 🎵 Music · ✨ Animation · ⏱️ Timer Style · 👁️ Hide UI
- Auto-hides 3s after idle, taps re-show
- Persistent visibility hint: subtle pulse on first session

### Three Pickers (consistent UI pattern)
**`src/components/focus/ThemePicker.tsx`** (already exists — refine)
**`src/components/focus/MusicPicker.tsx`** (new) — same UI as ThemePicker:
- Horizontal strip of 80×80 album-art thumbnails
- 20+ tracks tagged by season/mood: Lo-fi Rain, Forest Birds, Ocean Waves, Cherry Blossom Chimes, Autumn Wind, Winter Fireplace, Spring Stream, Summer Cicadas, Coffee Shop, Night Crickets, Binaural Alpha (8Hz), Beta (14Hz), Theta (6Hz), Library Whispers, Jazz Café, Piano Rain, Tibetan Bowls, White Noise, Brown Noise, Pink Noise
- Volume slider + crossfade
- Battery-safe pause

**`src/components/focus/AnimationPicker.tsx`** (new) — 15+ overlay animations:
- Snow · Rain · Cherry Blossom · Autumn Leaves · Fireflies · Dust Motes · Aurora · Stars · Meteor Shower · Bubbles · Smoke · Embers · Fog Drift · Lightning Flashes · Gradient Aurora · Candle Flicker · Ocean Ripple · Galaxy Spiral · Neon Pulse · None

### Timer Style Picker (10+ styles)
**`src/components/focus/TimerStylePicker.tsx`** (new):
1. **Minimal Mono** — large monospace digits
2. **Ring Arc** — circular SVG progress
3. **Flip Card** — 3D digit flip
4. **Pixel LED** — retro 7-segment
5. **Analog Clock** — full clock face with sweeping hand
6. **Liquid Fill** — water rises in glass
7. **Sand Hourglass** — animated falling sand
8. **Orbit** — planets circle showing time
9. **Pulse Ring** — breathing concentric circles
10. **Premium Black** — full-screen black, single elegant clock (immersive mode)
11. **Constellation** — stars connect to form digits
12. **Vinyl** — spinning record with arm

**`src/components/focus/TimerCanvas.tsx`** (new): renders selected style. Uses `mix-blend-mode: difference` + adaptive contrast (samples background brightness) so timer ALWAYS readable on any theme — fixes your "can't see timer" problem.

### Draggable + Hide-able Timer
- Timer wrapped in draggable container (framer-motion drag)
- Position persisted to localStorage per user
- "Hide UI" in radial menu → timer fades to 5% opacity, single tap anywhere reveals
- Long-press on timer → "Reset Position" toast

### Session Greeting + Celebration
**`src/components/focus/SessionGreeting.tsx`** (new):
- Pre-session: full-screen fade-in, "Take a breath. Let's begin." + 3-2-1 countdown ring
- Personalized: "Welcome back, [name]. Your 47th session."
- Quote of the day (rotating curated set)

**`src/components/focus/SessionComplete.tsx`** (refine existing FocusSessionComplete):
- 2s confetti particle burst from center (canvas)
- Stats card slides up: duration · streak · "You've focused 12h this week"
- Mood emoji row + quick journal input

## Track D — Admin Focus Manager (full CRUD)

**`src/components/admin/FocusThemeEditor.tsx`** (extend):
- Add tabs: Themes · Music · Animations
- Music CRUD: upload MP3/OGG, label, season tag, mood tag
- Animation CRUD: select from built-in registry + upload custom Lottie JSON
- All hydrate on app boot via `adminFocusThemes.ts`

**`src/lib/adminFocusMusic.ts`** (new): Firestore CRUD for `focusMusic/{id}`.
**`src/lib/adminFocusAnimations.ts`** (new): Firestore CRUD for `focusAnimations/{id}`.

## Track E — Dashboard Mobile Refinement

**`src/pages/Dashboard.tsx`** mobile:
- Remove top navbar entirely (Layout already handles)
- 4-row vertical native feed: Greeting + streak ring · Today's Plan (next 3 events) · Quick Stats (3 tiles) · Quick Actions
- All modals → MobileSheet
- Swipeable cards in "Today's Plan"

## Track F — Calendar Mobile Sheets

**`src/components/CalendarCreateModal.tsx`**: mobile branch → MobileSheet `snap="full"` with TimeWheelPicker, native form.
**`src/components/CalendarEventPopover.tsx`**: mobile branch → MobileSheet `snap="half"` with action row.

## Track G — Bottom Nav + Quick Action

**`src/components/MobileBottomNav.tsx`**: insert center `+` FAB (raised 8px above bar, purple glow) → opens contextual QuickActionSheet (different per page: Notes = New Note/Canvas/Folder, Study = Task/Event/Focus, Resources = Upload).

## Track H — Color Token Audit

Sweep `src/pages/*` and `src/components/*` for `bg-white`, `text-black`, `#hex`, `rgb(`, `bg-gray-`. Replace with semantic tokens. Verify dark mode contrast on every page.

## Files (~28, all parallel)

| File | Action |
|---|---|
| `src/pages/StudyMode.tsx` | Mobile rewrite |
| `src/components/study/QuickActionSheet.tsx` | New |
| `src/components/study/MobileTaskRow.tsx` | New |
| `src/components/study/MobileHabitGrid.tsx` | New |
| `src/pages/Notes.tsx` | Mobile Obsidian shell |
| `src/components/notes/MobileNoteHeader.tsx` | New |
| `src/pages/FocusMode.tsx` | Wire FocusHub + new pickers |
| `src/components/focus/FocusHub.tsx` | New radial menu |
| `src/components/focus/MusicPicker.tsx` | New |
| `src/components/focus/AnimationPicker.tsx` | New |
| `src/components/focus/TimerStylePicker.tsx` | New |
| `src/components/focus/TimerCanvas.tsx` | New (12 styles + adaptive contrast) |
| `src/components/focus/SessionGreeting.tsx` | New |
| `src/components/FocusSessionComplete.tsx` | Refine with confetti |
| `src/components/focus/SceneEngine.tsx` | Add 8+ animations |
| `src/lib/focusMusicLibrary.ts` | New 20-track curated library |
| `src/lib/focusAnimationLibrary.ts` | New animation registry |
| `src/components/admin/FocusThemeEditor.tsx` | 3-tab CRUD |
| `src/lib/adminFocusMusic.ts` | New |
| `src/lib/adminFocusAnimations.ts` | New |
| `src/pages/Dashboard.tsx` | Mobile 4-row feed |
| `src/components/CalendarCreateModal.tsx` | MobileSheet branch |
| `src/components/CalendarEventPopover.tsx` | MobileSheet branch |
| `src/components/MobileBottomNav.tsx` | Center FAB |
| `src/index.css` | Token sweep + adaptive-contrast util |
| `src/pages/Resources.tsx` | Token sweep |
| `src/components/Layout.tsx` | Token sweep |
| Misc components | Token sweep (bg-white/text-black removal) |

## Approach

- All tracks ship in one pass — no "next message"
- Music: royalty-free Pixabay/CDN URLs cached via existing `focusAssetCache`
- Timer adaptive contrast: sample 5×5px background pixel under timer center via canvas, flip text color (white/black) per luminance
- No new deps — confetti, draggable, all styles via existing framer-motion + canvas
- Desktop preserved everywhere (mobile branches only)
- Admin gets full CRUD for themes/music/animations — true command center

