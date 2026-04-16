

# Mobile-Native UI Rebuild — Every Route, Every Component

Complete mobile-native redesign across all routes. Desktop UI stays intact; mobile becomes a true native-feeling experience via responsive overrides + dedicated mobile components.

## Strategy

Single source of truth per page with responsive branches (`md:` for desktop, mobile-first defaults). No duplicate routes. Mobile gets: edge-to-edge layouts, sheet-based modals, bottom nav, swipe drawers, 44px+ tap targets, no hover dependencies.

## Phase 1 — Mobile foundation

**`src/index.css`**
- Add `.mobile-page` (edge-to-edge, pb-20 for bottom nav clearance, safe-area insets)
- Add `.mobile-sheet-handle` (drag handle for bottom sheets)
- Add `.tap-44` (min 44×44px touch targets)
- Add `.mobile-card` (no border, subtle bg, full-width)
- Active-state utilities replacing hover (`active:scale-[0.98]`, `active:bg-accent`)

**`src/components/Layout.tsx`**
- Mobile: hide top navbar entirely, show only thin 44px status strip (logo + theme + bell)
- Add left-swipe drawer (Sheet) for secondary nav: Admin, Switch Institution, Sign Out, Theme
- Remove all `max-w-*` on mobile; pages render edge-to-edge
- `pb-16` global on mobile pages

**`src/components/MobileBottomNav.tsx`**
- 6 tabs: Home, Dashboard, Study, Notes, Resources, Profile
- 56px height, larger icons (h-6), active pill with purple glow
- Press animation (scale 0.92 on tap)

## Phase 2 — Mobile redesign per route

**`src/pages/Index.tsx` (Home)**
- Mobile: vertical hero, single-column course list, sticky filter chip row (horizontal scroll), pull-to-refresh feel
- Course cards become full-width with image header

**`src/pages/Dashboard.tsx`**
- Mobile: 2×2 metric grid (compact), horizontal-scroll course progress, vertical activity feed
- Heatmap becomes horizontal-scroll with momentum

**`src/pages/StudyMode.tsx`**
- Mobile: force vertical day-view calendar (no week grid)
- Tab bar at top for system switcher (Calendar/Tasks/Habits/Focus/Analytics) — horizontal scroll
- FAB (floating action button) bottom-right for quick-create
- Sidebar accessed via swipe-from-left
- Tasks: large checkable rows, swipe-left to delete, swipe-right to complete

**`src/pages/Notes.tsx`**
- Mobile: sidebar collapsed by default, swipe-right to open
- Sticky bottom formatting toolbar (Bold, Italic, H1, List, Link, Image, Slash) — 44px buttons
- Workspace switcher = top sheet trigger
- Note list = full-screen drawer

**`src/pages/Resources.tsx`**
- Mobile: sticky course filter at top, single-column resource cards
- Folder breadcrumb pill row (horizontal scroll)
- Admin: FAB "+" for add resource → bottom sheet form

**`src/pages/Profile.tsx`**
- Mobile: avatar + name centered hero, settings as iOS-style grouped list rows
- Each section as separated card with chevron right

**`src/pages/Auth.tsx`**
- Mobile: full-screen, centered logo, large inputs (h-12), large buttons
- "Try Demo" as prominent secondary CTA

**`src/pages/CourseSelect.tsx`**
- Mobile: stacked cards (Question Bank / Resources), full-width

**`src/pages/Admin.tsx`**
- Mobile: collapsible sections, tab bar with horizontal scroll, all forms become bottom sheets

**`src/pages/Notifications.tsx` + `src/pages/Bookmarks.tsx`**
- Mobile: full-screen list, swipe actions, pull-to-refresh affordance

**`src/pages/CollegeSelect.tsx`**
- Mobile: full-screen search bar at top, vertical card list

**`src/pages/FocusMode.tsx`**
- Already fullscreen — verify touch controls (auto-hide, tap to reveal)

**`src/pages/Quiz.tsx` + `src/pages/Flashcards.tsx`**
- Mobile: full-screen, swipe-left/right for next/prev, large tap targets for answers

## Phase 3 — Component-level mobile passes

- `src/components/CourseCard.tsx` — full-width on mobile, larger CTAs
- `src/components/notes/NoteEditor.tsx` — sticky mobile toolbar, larger paragraph spacing
- `src/components/notes/CanvasView.tsx` — pinch-zoom, two-finger pan
- `src/components/CalendarView.tsx` — vertical day-list on mobile
- `src/components/FloatingDock.tsx` — hidden on mobile (replaced by bottom nav)
- All modals (`Dialog`) → use `Drawer` (vaul) on mobile via responsive wrapper

## Phase 4 — Polish

- Add `useMobile()` hook usage where needed
- Remove hover-only tooltips; replace with long-press or always-visible labels
- Add page transition fade (200ms) between routes on mobile
- Verify safe-area insets on iOS notch
- TypeScript build verification

## Files touched (~25)

| File | Action |
|------|--------|
| `src/index.css` | Mobile utilities, safe-area, tap targets |
| `src/components/Layout.tsx` | Mobile nav suppression, swipe drawer |
| `src/components/MobileBottomNav.tsx` | 6 tabs with Resources |
| `src/pages/Index.tsx` | Mobile hero + sticky filters |
| `src/pages/Dashboard.tsx` | 2×2 grid, horizontal-scroll sections |
| `src/pages/StudyMode.tsx` | Vertical day-view, FAB, swipe sidebar |
| `src/pages/Notes.tsx` | Bottom toolbar, sheet workspace switcher |
| `src/pages/Resources.tsx` | Sticky filter, FAB add |
| `src/pages/Profile.tsx` | iOS-style grouped settings |
| `src/pages/Auth.tsx` | Full-screen mobile auth |
| `src/pages/CourseSelect.tsx` | Stacked mobile cards |
| `src/pages/Admin.tsx` | Sheet-based forms |
| `src/pages/Notifications.tsx` | Swipe-action list |
| `src/pages/Bookmarks.tsx` | Swipe-action list |
| `src/pages/CollegeSelect.tsx` | Full-screen mobile search |
| `src/pages/Quiz.tsx` | Swipe nav, large targets |
| `src/pages/Flashcards.tsx` | Swipe nav |
| `src/components/CourseCard.tsx` | Full-width mobile |
| `src/components/notes/NoteEditor.tsx` | Sticky mobile toolbar |
| `src/components/notes/CanvasView.tsx` | Pinch zoom |
| `src/components/CalendarView.tsx` | Vertical day-list |
| `src/components/FloatingDock.tsx` | Hide on mobile |

## Notes

- No new dependencies — `vaul` Drawer already installed
- All changes are additive responsive overrides; desktop unchanged
- Native swipe gestures via pointer events (no library)
- Bottom sheets via existing `Drawer` component

