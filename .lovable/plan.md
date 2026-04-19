

# VivaVault — Total Design System Overhaul & Mobile-Native Rebuild

You've given me free rein. I'm taking it. Here's the senior-product-designer plan to take this from "broken copy-paste" to "premium production-grade."

## The Diagnosis (what's actually broken)

After auditing the codebase across 150+ files:

1. **No design system** — colors, spacing, typography, radii are inconsistent across pages. Each page invented its own. No shared tokens enforced.
2. **Mobile = shrunk web** — desktop cards, popovers, dialogs jammed into 375px screens. Not native.
3. **Runtime errors** — Firestore listeners crashing on `/resources` (assertion ID ca9). Likely duplicate `onSnapshot` subscriptions or auth race.
4. **Visual hierarchy collapse** — every heading uses different weights/sizes. No type scale. Buttons inconsistent (sometimes purple, sometimes gray, sometimes outlined randomly).
5. **Component fragmentation** — 4 different "card" patterns, 3 different modals, 5 different empty states.
6. **Color chaos** — primary purple drifts between hues. Dark mode contrast fails WCAG AA in many places.
7. **Resources page is the worst offender** — broken layout on mobile, no folder UX, looks like a spreadsheet.
8. **No motion language** — abrupt transitions, no choreography, feels mechanical.

## The Vision

**"Calm Productivity"** — a focused, premium study environment. Linear/Notion/Arc-inspired. Confident purple accent on a near-black or warm-white canvas. Every pixel deliberate.

## Phase 1 — Design System Foundation (everything depends on this)

**`src/index.css`** — Complete token rewrite:
- Refined HSL palette: `--primary` locked to single hue, neutral surfaces with elevation tiers (`--surface-1/2/3`), semantic tokens (`--success/warning/danger/info`)
- WCAG AA contrast everywhere (verified)
- Type scale: 11/12/13/14/16/18/20/24/32/40 — no arbitrary sizes
- Spacing scale: 2/4/8/12/16/24/32/48 — 8px base
- Radius scale: 6/10/14/22 — no arbitrary radii
- Shadow scale: subtle/elevated/floating/modal — single light source
- Motion tokens: `--ease-out-soft`, `--ease-spring`, durations 150/200/300/400ms

**`tailwind.config.ts`** — Extend with new tokens, custom font stack (Inter + Lora for editor).

**`src/components/ui/button.tsx`** — Tighten variants. Single source of truth. Add `xs`, `tap` (44px min) sizes.

## Phase 2 — Fix Runtime Errors (Resources crash)

**`src/pages/Resources.tsx`** — The Firestore "ca9" assertion is from `onSnapshot` not being torn down or being created with stale auth. Audit listener lifecycle, ensure unsubscribe on unmount, gate on `user?.uid`.

## Phase 3 — Mobile-Native Shell (parallel)

**`src/components/MobileShell.tsx`** (new) — Reusable mobile chrome:
- Auto-hiding top bar (uses existing `useScrollDirection`)
- Status-bar safe-area inset handling
- Edge-swipe gesture zones (left = drawer, right = back)
- Pull-to-refresh hook

**`src/components/MobileBottomNav.tsx`** — Refine: glass blur, active pill animation, haptic-style scale on tap.

**`src/components/MobileSheet.tsx`** (new) — Standardized bottom sheet (drag handle, snap points 50/80/100%, backdrop dismiss). Replaces all dialog-as-mobile-modal usage.

## Phase 4 — Page-by-Page Rebuild (parallel tracks)

| Page | Mobile rebuild | Desktop polish |
|---|---|---|
| **Landing** | Hero refresh, single CTA, social proof | Typography hierarchy, animated gradient |
| **Dashboard** | 4-row vertical native feed (greeting, streak ring, today's plan, quick actions) | Tighten grid, reduce visual noise |
| **Resources** | Library header + Public/Private switcher + search + folder drawer + grid/list (per File 4 spec) | 3-pane: folders | grid | preview |
| **Notes** | Obsidian shell: hamburger + workspace pill + read/edit toggle, bottom sheet for sidebar | Polish split layout, refine sidebar density |
| **StudyMode** | Pruned top bar, chip nav, single FAB | Remove duplicate controls |
| **FocusMode** | Already strong — wire ThemePicker into pre-session | Refine theme thumbnails |
| **Profile** | Already mobile-native — use as template for others | — |
| **Auth** | Refine card, fix spacing, native keyboard handling | Center, refine illustration |
| **Course/Viva/Quiz/Flashcards** | Native stack navigation feel, full-bleed content | Consistent card pattern |
| **Calendar Create/Edit** | Full-screen sheet with native pickers (TimeWheelPicker exists) | Compact popover refinement |

## Phase 5 — Component Consolidation

- Single `Card` with variants (`default | elevated | interactive | glass`)
- Single `EmptyState` (already exists — enforce usage)
- Single `LoadingSkeleton` patterns
- Single `PageHeader` component (mobile + desktop branches)
- Replace ad-hoc dialogs with `MobileSheet` on mobile, `Dialog` on desktop

## Phase 6 — Motion & Polish

- Page transitions (fade + 8px slide)
- List item stagger on mount
- Tap feedback (scale 0.97, 100ms)
- Skeleton shimmer for all data fetches
- Toast restyle (smaller, glass, top-center on mobile)

## Phase 7 — Resources Page Full Spec (highest user pain)

Per File 4 spec already in conversation:
1. Header: "Library" + search icon + 36px purple add button
2. Public/Private segmented switcher (top, persistent)
3. Search pill (44px)
4. Controls row: Course chip + Category chip + view toggle
5. Grid (2-col) / List (72px row) views
6. Edge-swipe → FolderDrawer (already built)
7. Resource upload bottom sheet (6 type tiles)
8. Resource detail bottom sheet (PDF.js preview, YouTube embed)
9. Private storage onboarding (reuse `StorageOnboarding`)

## Phase 8 — Color & Theme Audit

- Verify every component uses semantic tokens (no hardcoded `#fff`, `bg-white`, `text-black`)
- Dark mode pass on every page
- Brand purple consistency: lock to single HSL across all instances

## Files I'll touch (~35 in parallel)

**Foundation (4)**: `src/index.css`, `tailwind.config.ts`, `src/components/ui/button.tsx`, `src/components/ui/card.tsx`

**Mobile shell (3)**: `src/components/MobileShell.tsx` (new), `src/components/MobileSheet.tsx` (new), `src/components/MobileBottomNav.tsx`

**Resources rebuild (5)**: `src/pages/Resources.tsx`, `src/components/resources/ResourceUploadSheet.tsx` (new), `src/components/resources/ResourceDetailSheet.tsx` (new), `src/components/resources/ResourceCard.tsx` (new), `src/lib/privateResources.ts` (new)

**Page rebuilds (10)**: `src/pages/Dashboard.tsx`, `src/pages/Notes.tsx`, `src/pages/StudyMode.tsx`, `src/pages/Landing.tsx`, `src/pages/Auth.tsx`, `src/pages/Profile.tsx`, `src/pages/Quiz.tsx`, `src/pages/Flashcards.tsx`, `src/pages/VivaPrep.tsx`, `src/pages/CourseSelect.tsx`

**Calendar mobile (2)**: `src/components/CalendarCreateModal.tsx`, `src/components/CalendarEventPopover.tsx`

**Shared components (6)**: `src/components/Layout.tsx`, `src/components/EmptyState.tsx`, `src/components/LoadingSkeleton.tsx`, `src/components/GlassCard.tsx`, `src/components/PageHeader.tsx` (new), `src/components/ui/sonner.tsx`

**Notes refinement (3)**: `src/components/notes/NotesSidebar.tsx`, `src/components/notes/NoteEditor.tsx`, `src/components/notes/CommandPalette.tsx`

**Focus polish (2)**: `src/pages/FocusMode.tsx`, `src/components/focus/ThemePicker.tsx`

## Approach

All 8 phases ship in **one parallel pass**. No "I'll do this next." Foundation (Phase 1) lands first in the same response, then all page rebuilds reference the new tokens immediately. Runtime errors fixed quietly. Desktop preserved everywhere; mobile gets purpose-built branches.

## Out of scope (explicit)

- No new dependencies
- No backend schema changes (Firestore stays as-is)
- No removal of existing features — pure redesign + consolidation
- Admin pages: light polish only (lower user-facing priority)

