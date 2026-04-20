# Implementation Plan: Mobile Native Full-Bleed Layout

## Overview

Replace the existing mobile top header bars on Notes OS (`/notes`) and Study OS (`/study`) with a full-bleed, mobile-native layout matching the Library page pattern. All changes are inline JSX replacements within `src/pages/Notes.tsx` and `src/pages/StudyMode.tsx` — no new files or shared components required.

## Tasks

- [x] 1. Notes OS — Replace mobile header with full-bleed top row
  - In `src/pages/Notes.tsx`, locate and remove the existing `md:hidden` mobile top bar JSX
  - Add the new `<header>` element with `sticky top-0 z-30 bg-background/85 backdrop-blur-2xl border-b border-border/50 md:hidden` and `paddingTop: env(safe-area-inset-top, 0px)`
  - Row 1: hamburger button (`onClick={() => setMobileDrawerOpen(true)}`), `<h1>Notes OS</h1>` centered, `DropdownMenu` with `MoreHorizontal` trigger containing Mine/Public/Space items that call `setWorld`
  - Row 2: inline search bar — `<Input>` with `pl-11 h-11 rounded-full bg-muted/50 border-transparent` and a `<Search>` icon absolutely positioned left
  - Row 3: animated scope switcher — `bg-muted/60 rounded-full p-1 flex relative h-10` container with a `motion.div layout` sliding pill and three buttons for Mine/Public/Space
  - Import `MoreHorizontal` from `lucide-react` and `DropdownMenu*` from `@/components/ui/dropdown-menu` if not already imported
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.3, 4.1, 4.2, 4.3, 11.1, 11.3_

  - [ ]* 1.1 Write property test for Notes OS top row always renders three required elements
    - **Property 1: Notes OS top row always renders three required elements**
    - **Validates: Requirements 2.1**

  - [ ]* 1.2 Write property test for mode selection always updates world state
    - **Property 2: Mode selection always updates world state**
    - **Validates: Requirements 2.4, 4.2**

  - [ ]* 1.3 Write property test for hamburger always opens the drawer
    - **Property 3: Hamburger always opens the drawer**
    - **Validates: Requirements 2.2, 5.2**

  - [ ]* 1.4 Write property test for consistent sticky header styling on Notes OS
    - **Property 9: Consistent sticky header styling**
    - **Validates: Requirements 11.1**

  - [ ]* 1.5 Write property test for consistent search bar styling on Notes OS
    - **Property 10: Consistent search bar styling**
    - **Validates: Requirements 11.3**

- [x] 2. Notes OS — Full-bleed content flow and drawer wiring
  - Verify the existing `mobileDrawerOpen` overlay drawer in `Notes.tsx` is triggered by the new hamburger (already wired via `setMobileDrawerOpen(true)` in task 1)
  - Ensure the `NotesSidebar` `onSelectNote` callback still calls `setMobileDrawerOpen(false)` to close the drawer after note selection
  - Confirm the page renders with `<Layout fullBleed hideBottomNav>` (already present) so the global mobile status strip is suppressed
  - Confirm no `MobileTopBar` component is imported or rendered anywhere in `Notes.tsx`
  - _Requirements: 1.1, 1.2, 5.1, 5.2, 5.3, 11.5_

  - [ ]* 2.1 Write property test for MobileTopBar never rendered on Notes OS mobile
    - **Property 11: MobileTopBar never rendered on mobile**
    - **Validates: Requirements 1.1, 1.2, 11.5**

- [x] 3. Checkpoint — Notes OS
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Study OS — Replace mobile header with full-bleed top row
  - In `src/pages/StudyMode.tsx`, locate and remove the existing `md:hidden` top bar (the 48px bar showing `activeSection` name and Focus button)
  - Add the new `<header>` element with `sticky top-0 z-30 bg-background/85 backdrop-blur-2xl border-b border-border/50 md:hidden` and `paddingTop: env(safe-area-inset-top, 0px)`
  - Row 1: hamburger button (`onClick={() => setMobileDrawerOpen(true)}`), `<h1>Study OS</h1>` centered, Quick Focus pill button (`<Zap>` icon + "Focus" label, `px-3 h-9 rounded-full text-xs font-medium text-primary bg-primary/10`, `onClick={() => setShowQuickFocus(true)}`)
  - Row 2: inline search bar — same `pl-11 h-11 rounded-full bg-muted/50 border-transparent` style, `placeholder="Search Study OS…"`, bound to `searchQuery` state
  - _Requirements: 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 7.4, 8.1, 8.3, 11.2, 11.4_

  - [ ]* 4.1 Write property test for Study OS top row always renders three required elements
    - **Property 4: Study OS top row always renders three required elements**
    - **Validates: Requirements 7.1**

  - [ ]* 4.2 Write property test for consistent sticky header styling on Study OS
    - **Property 9: Consistent sticky header styling**
    - **Validates: Requirements 11.2**

  - [ ]* 4.3 Write property test for consistent search bar styling on Study OS
    - **Property 10: Consistent search bar styling**
    - **Validates: Requirements 11.4**

- [x] 5. Study OS — VS Code-style tab switcher
  - Remove the existing `md:hidden` rounded-full pill tab row from `StudyMode.tsx`
  - Add the new tab switcher `<div>` with `overflow-x-auto no-scrollbar border-b border-border/40 sticky` below the search bar, inside the same `md:hidden` header block
  - Render `SECTION_TABS.map(...)` — each tab button: `flex items-center gap-1.5 px-4 h-10 text-xs font-body font-medium`, active tab gets `text-primary bg-primary/5 border-b-2 border-primary`, inactive gets `text-muted-foreground border-b-2 border-transparent`
  - Each tab `onClick` calls `setActiveSection(tab.id)`
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 5.1 Write property test for tab switcher always renders exactly five tabs
    - **Property 5: Tab switcher always renders exactly five tabs**
    - **Validates: Requirements 9.1**

  - [ ]* 5.2 Write property test for active tab styling invariant
    - **Property 6: Active tab styling invariant**
    - **Validates: Requirements 9.2**

  - [ ]* 5.3 Write property test for tab tap always updates activeSection
    - **Property 7: Tab tap always updates activeSection**
    - **Validates: Requirements 9.3, 10.1**

- [x] 6. Study OS — Horizontal slide animation and search filtering
  - Add a `prevTabIndex` ref (`useRef`) to track the previous tab index for slide direction
  - Wrap the active section content render in `<AnimatePresence mode="wait" initial={false}>` + `<motion.div key={activeSection} initial={{ x: direction * 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: direction * -40, opacity: 0 }} transition={{ duration: 0.2, ease: "easeInOut" }}>`
  - Wire `searchQuery` to filter tasks (by title) when `activeSection === "tasks"` and habits (by name) when `activeSection === "habits"`; calendar events filtering is a no-op (search bar is present but filtering calendar events is out of scope per existing behavior)
  - Add bottom padding `calc(5rem + env(safe-area-inset-bottom, 0px))` to the content area to avoid overlap with `MobileBottomNav`
  - _Requirements: 8.2, 9.6, 10.1, 10.2, 10.3_

  - [ ]* 6.1 Write property test for search filtering invariant
    - **Property 8: Search filtering invariant**
    - **Validates: Requirements 8.2**

- [x] 7. Study OS — Full-bleed content flow and drawer wiring
  - Confirm the existing `mobileDrawerOpen` overlay drawer in `StudyMode.tsx` is triggered by the new hamburger
  - Confirm the page renders with `<Layout fullBleed>` so the global mobile status strip is suppressed
  - Confirm no `MobileTopBar` component is imported or rendered anywhere in `StudyMode.tsx`
  - _Requirements: 6.1, 6.2, 6.3, 11.5_

  - [ ]* 7.1 Write property test for MobileTopBar never rendered on Study OS mobile
    - **Property 11: MobileTopBar never rendered on mobile**
    - **Validates: Requirements 6.1, 6.2, 11.5**

- [x] 8. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- All changes are confined to `src/pages/Notes.tsx` and `src/pages/StudyMode.tsx` — no new files needed
- The `Layout` component already supports `fullBleed` mode; no changes to `Layout.tsx` are required
- Desktop layouts are entirely unaffected — all new JSX is wrapped in `md:hidden`
- Property tests use `fast-check` for TypeScript property-based testing
