# Design Document: Mobile Native Full-Bleed Layout

## Overview

This feature replaces the existing mobile top header bars on the Notes OS (`/notes`) and Study OS (`/study`) pages with a full-bleed, mobile-native layout that matches the pattern already implemented on the Library page (`/resources`). The result is a seamless, immersive experience where the background is continuous from top to bottom, the top row is inline content (not a separate header bar), and all interactive elements flow naturally below it.

The Library page (`/resources`) is the canonical reference implementation. Its mobile render path — `Layout fullBleed` wrapper, sticky header with `bg-background/85 backdrop-blur-2xl`, animated scope switcher, and `rounded-full bg-muted/50` search bar — defines the visual and structural contract that Notes OS and Study OS must match.

### Key Design Goals

- Remove the existing `md:hidden` mobile top bars from both pages
- Wire `fullBleed` prop into `Layout` so the global mobile status strip is suppressed
- Add a new inline top row (hamburger + page title + right action) to each page
- Add an inline search bar below the top row on both pages
- Notes OS: add an animated Mine/Public/Space sliding pill toggle below search
- Study OS: replace the existing rounded-full pill tab row with a VS Code-style tab switcher below search
- Apply `paddingTop: env(safe-area-inset-top, 0px)` to all new top rows for safe area compliance
- Preserve all existing desktop layouts and functionality unchanged

---

## Architecture

The change is entirely within two page components and does not require new routes, new context providers, or changes to the shared `Layout` component. The `Layout` component already supports `fullBleed` mode — both pages already pass `fullBleed` to `Layout`, so the global mobile status strip is already suppressed. The work is replacing the existing inline mobile header JSX inside each page with the new full-bleed top row pattern.

```
Layout (fullBleed=true)
  └── Page (Notes.tsx or StudyMode.tsx)
        ├── [NEW] MobileFullBleedHeader (md:hidden)
        │     ├── sticky top row: hamburger | title | right action
        │     ├── search bar (rounded-full, bg-muted/50)
        │     └── Notes OS: animated scope switcher
        │         Study OS: VS Code tab switcher
        ├── [EXISTING] Desktop sidebar (hidden md:flex)
        ├── [EXISTING] Mobile overlay drawer (AnimatePresence)
        └── [EXISTING] Main content area
```

No new files are required. All changes are inline JSX replacements within `src/pages/Notes.tsx` and `src/pages/StudyMode.tsx`.

---

## Components and Interfaces

### Shared Pattern: Full-Bleed Top Row

Both pages share the same structural pattern for the top row. The pattern is extracted here as a reference — it is implemented inline in each page, not as a shared component, to keep the diff minimal and avoid over-abstraction for two pages.

```tsx
// Shared top row pattern (inline in each page)
<header
  className="sticky top-0 z-30 bg-background/85 backdrop-blur-2xl border-b border-border/50 md:hidden"
  style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
>
  {/* Row 1: hamburger | title | right action */}
  <div className="px-4 pt-3 pb-2 flex items-center gap-3">
    <button onClick={() => setMobileDrawerOpen(true)} className="h-9 w-9 -ml-2 flex items-center justify-center rounded-xl hover:bg-accent active:scale-95 transition" aria-label="Open menu">
      <Menu className="h-5 w-5" />
    </button>
    <h1 className="font-heading font-bold text-[22px] flex-1 leading-none">{PAGE_TITLE}</h1>
    {/* RIGHT ACTION — differs per page */}
  </div>

  {/* Row 2: search bar */}
  <div className="px-4 pb-2">
    <div className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="..."
        className="pl-11 h-11 rounded-full bg-muted/50 border-transparent font-body text-[15px] focus-visible:bg-card"
      />
    </div>
  </div>

  {/* Row 3: page-specific control (scope switcher or tab switcher) */}
</header>
```

### Notes OS: Mode Menu (Three-Dot)

The three-dot icon on the Notes OS top row opens a `DropdownMenu` with three items: Mine, Public, Space. Selecting an item calls `setWorld("my" | "public" | "space")`. This is the same `world` state already used by the page — the new menu is just an additional entry point alongside the existing animated toggle below the search bar.

```tsx
// Right action for Notes OS top row
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <button className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-accent" aria-label="Switch workspace">
      <MoreHorizontal className="h-5 w-5" />
    </button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="w-40 font-body">
    <DropdownMenuItem onClick={() => setWorld("my")}>Mine</DropdownMenuItem>
    <DropdownMenuItem onClick={() => setWorld("public")}>Public</DropdownMenuItem>
    <DropdownMenuItem onClick={() => setWorld("space")}>Space</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Notes OS: Animated Scope Switcher

The Mine/Public/Space segmented control uses the same animated sliding pill pattern as the Library page's Public/My Resources switcher. A `motion.div` with `layout` transition slides to the active segment position.

```tsx
// Animated scope switcher (below search bar, Notes OS)
<div className="px-4 pb-3">
  <div className="bg-muted/60 rounded-full p-1 flex relative h-10">
    <motion.div
      layout
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className="absolute top-1 bottom-1 bg-card rounded-full shadow-sm"
      style={{
        width: "calc(33.333% - 4px)",
        left: world === "my" ? 4 : world === "public" ? "calc(33.333%)" : "calc(66.666%)",
      }}
    />
    {(["my", "public", "space"] as const).map((w, i) => (
      <button
        key={w}
        onClick={() => setWorld(w)}
        className={cn(
          "relative flex-1 text-sm font-body font-medium capitalize z-10 transition-colors",
          world === w ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {w === "my" ? "Mine" : w === "public" ? "Public" : "Space"}
      </button>
    ))}
  </div>
</div>
```

### Study OS: VS Code-Style Tab Switcher

The tab switcher replaces the existing `md:hidden` rounded-full pill tab row. Each tab has an icon and label. The active tab has a 2px bottom border in `hsl(var(--primary))` and a `bg-primary/5` background. The row is horizontally scrollable and sticky below the search bar.

```tsx
// VS Code-style tab switcher (below search bar, Study OS)
<div className="overflow-x-auto no-scrollbar border-b border-border/40 sticky top-[calc(56px+env(safe-area-inset-top,0px)+56px)] z-20 bg-background/85 backdrop-blur-2xl">
  <div className="flex min-w-max">
    {SECTION_TABS.map(tab => (
      <button
        key={tab.id}
        onClick={() => setActiveSection(tab.id)}
        className={cn(
          "flex items-center gap-1.5 px-4 h-10 text-xs font-body font-medium transition-all whitespace-nowrap shrink-0 relative",
          activeSection === tab.id
            ? "text-primary bg-primary/5 border-b-2 border-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border-b-2 border-transparent"
        )}
      >
        <tab.icon className="h-3.5 w-3.5" />
        {tab.label}
      </button>
    ))}
  </div>
</div>
```

### Study OS: Quick Focus Button

The right action on the Study OS top row is a pill button that opens the existing `showQuickFocus` modal:

```tsx
// Right action for Study OS top row
<button
  onClick={() => setShowQuickFocus(true)}
  className="flex items-center gap-1.5 px-3 h-9 rounded-full text-xs font-body font-medium text-primary bg-primary/10 active:bg-primary/20 transition-colors shrink-0"
>
  <Zap className="h-3.5 w-3.5" />
  Focus
</button>
```

### Horizontal Slide Animation (Study OS Tab Content)

When the active tab changes, the content area animates with a horizontal slide. The direction is determined by comparing the new tab index to the previous tab index.

```tsx
// Wrap content area in AnimatePresence + motion.div
const tabIndex = SECTION_TABS.findIndex(t => t.id === activeSection);
const prevTabIndex = useRef(tabIndex);
const direction = tabIndex > prevTabIndex.current ? 1 : -1;

<AnimatePresence mode="wait" initial={false}>
  <motion.div
    key={activeSection}
    initial={{ x: direction * 40, opacity: 0 }}
    animate={{ x: 0, opacity: 1 }}
    exit={{ x: direction * -40, opacity: 0 }}
    transition={{ duration: 0.2, ease: "easeInOut" }}
    className="flex-1 flex flex-col overflow-hidden"
  >
    {/* active section content */}
  </motion.div>
</AnimatePresence>
```

---

## Data Models

No new data models are introduced. This feature is purely a UI/layout change. The existing state variables in both pages are reused:

**Notes.tsx (existing state, reused)**
- `world: "my" | "public" | "space"` — workspace mode, now also set by the new Mode Menu
- `search: string` — search query, bound to the new inline search bar
- `mobileDrawerOpen: boolean` — drawer state, now triggered by the new hamburger icon

**StudyMode.tsx (existing state, reused)**
- `activeSection: "calendar" | "tasks" | "habits" | "focus" | "analytics"` — now set by the new VS Code tab switcher
- `searchQuery: string` — search query, bound to the new inline search bar
- `mobileDrawerOpen: boolean` — drawer state, now triggered by the new hamburger icon
- `showQuickFocus: boolean` — focus modal state, now triggered by the new Quick Focus button

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Notes OS top row always renders three required elements

*For any* state of the Notes OS page (any world value, any notes list, any loading state), the mobile top row SHALL always contain a hamburger/menu button, the text "Notes OS", and a three-dot menu button.

**Validates: Requirements 2.1**

### Property 2: Mode selection always updates world state

*For any* mode value in {my, public, space}, selecting that mode from either the Mode Menu (three-dot dropdown) or the animated scope switcher SHALL update the `world` state to the corresponding value.

**Validates: Requirements 2.4, 4.2**

### Property 3: Hamburger always opens the drawer

*For any* initial state of the Notes OS page (any world, any selectedNoteId, any loading state), tapping the hamburger icon SHALL result in `mobileDrawerOpen` becoming true and the NotesSidebar drawer being rendered.

**Validates: Requirements 2.2, 5.2**

### Property 4: Study OS top row always renders three required elements

*For any* activeSection value, the Study OS mobile top row SHALL always contain a hamburger/menu button, the text "Study OS", and a Quick Focus button.

**Validates: Requirements 7.1**

### Property 5: Tab switcher always renders exactly five tabs

*For any* Study OS state, the VS Code-style tab switcher SHALL render exactly five tabs with labels: Calendar, Tasks, Habits, Focus, Analytics — in that order.

**Validates: Requirements 9.1**

### Property 6: Active tab styling invariant

*For any* activeSection value, the corresponding tab in the tab switcher SHALL have the active styles (2px bottom border in primary color, bg-primary/5 background), and all other four tabs SHALL NOT have those active styles.

**Validates: Requirements 9.2**

### Property 7: Tab tap always updates activeSection

*For any* tab in the Study OS tab switcher, tapping it SHALL update `activeSection` to the corresponding section id, and the corresponding content SHALL be rendered below the tab switcher.

**Validates: Requirements 9.3, 10.1**

### Property 8: Search filtering invariant

*For any* non-empty search query string entered in the Study OS search bar, all displayed items in the active section (tasks for Tasks, habits for Habits) SHALL contain the search query string (case-insensitive). No items that do not match the query SHALL be displayed.

**Validates: Requirements 8.2**

### Property 9: Consistent sticky header styling

*For any* state of either the Notes OS or Study OS page, the mobile top row element SHALL have the CSS classes: `sticky top-0 z-30 bg-background/85 backdrop-blur-2xl border-b border-border/50` — matching the Library page reference implementation.

**Validates: Requirements 11.1, 11.2**

### Property 10: Consistent search bar styling

*For any* state of either the Notes OS or Study OS page, the inline search input SHALL have the CSS classes: `rounded-full bg-muted/50 border-transparent pl-11 h-11` — matching the Library page reference implementation.

**Validates: Requirements 11.3, 11.4**

### Property 11: MobileTopBar never rendered on mobile

*For any* mobile viewport width (< 768px), rendering either the Notes OS or Study OS page SHALL NOT include a `MobileTopBar` component in the rendered output.

**Validates: Requirements 1.1, 1.2, 6.1, 6.2, 11.5**

---

## Error Handling

Since this is a pure UI layout change with no new data fetching or async operations, error handling is minimal:

**Safe area insets**: The `env(safe-area-inset-top, 0px)` fallback ensures the layout degrades gracefully on browsers that do not support CSS environment variables (the fallback `0px` means no extra padding, which is correct for non-notched devices).

**Framer Motion availability**: Both pages already import and use `framer-motion`. The animated scope switcher and tab slide animation depend on it. If `framer-motion` is unavailable, the layout should fall back to static positioning — the `motion.div` with `layout` can be replaced with a plain `div` with a CSS `transition` as a fallback.

**World state on mount**: The `world` state defaults to `"my"`. If the user navigates directly to `/notes?world=public`, the URL param is not currently read — this is existing behavior and is out of scope for this feature.

**Search bar focus on mobile**: When the search bar is focused on mobile, the keyboard will push the viewport up. The existing `VisualViewport` keyboard handling (referenced in the design docs) should be applied to the new search bars to prevent the sticky header from being obscured.

**Tab switcher overflow**: The tab switcher uses `overflow-x-auto no-scrollbar` to handle cases where all five tabs do not fit in the viewport width. On very narrow viewports (< 320px), tabs will scroll horizontally without a visible scrollbar.

---

## Testing Strategy

### Unit Tests (Example-Based)

These tests verify specific interactions and rendering states:

1. **Notes OS top row renders correctly** — render `Notes` at 375px width, assert header contains hamburger button, "Notes OS" text, and MoreHorizontal button.
2. **Notes OS drawer opens on hamburger tap** — simulate click on hamburger, assert `mobileDrawerOpen` state is true and drawer overlay is rendered.
3. **Notes OS mode menu opens on three-dot tap** — simulate click on MoreHorizontal, assert dropdown with Mine/Public/Space items is visible.
4. **Notes OS scope switcher renders three segments** — assert segmented control has Mine, Public, Space buttons.
5. **Study OS top row renders correctly** — render `StudyMode` at 375px width, assert header contains hamburger, "Study OS" text, and Quick Focus button.
6. **Study OS Quick Focus button opens modal** — simulate click on Quick Focus, assert `showQuickFocus` state is true.
7. **Study OS tab switcher renders five tabs** — assert exactly five tab buttons with correct labels.
8. **Study OS content renders for each section** — for each of the five section ids, assert the corresponding content component is rendered.
9. **MobileTopBar not rendered** — render both pages at mobile width, assert no MobileTopBar component in the output.

### Property-Based Tests

Property-based tests use a library such as `fast-check` (TypeScript) to generate random inputs and verify universal properties. Each test runs a minimum of 100 iterations.

**Feature: mobile-native-fullbleed-layout, Property 1: Notes OS top row always renders three required elements**
- Generator: arbitrary `world` value, arbitrary notes array, arbitrary loading boolean
- Assertion: rendered output always contains hamburger button, "Notes OS" heading, MoreHorizontal button

**Feature: mobile-native-fullbleed-layout, Property 2: Mode selection always updates world state**
- Generator: arbitrary mode value from {my, public, space}
- Assertion: after selecting the mode, `world` state equals the selected value

**Feature: mobile-native-fullbleed-layout, Property 3: Hamburger always opens the drawer**
- Generator: arbitrary Notes OS state (world, selectedNoteId, loading)
- Assertion: after tapping hamburger, `mobileDrawerOpen` is true

**Feature: mobile-native-fullbleed-layout, Property 4: Study OS top row always renders three required elements**
- Generator: arbitrary `activeSection` value from the five valid values
- Assertion: rendered output always contains hamburger, "Study OS" heading, Quick Focus button

**Feature: mobile-native-fullbleed-layout, Property 5: Tab switcher always renders exactly five tabs**
- Generator: arbitrary Study OS state
- Assertion: tab switcher contains exactly 5 tab buttons with labels Calendar, Tasks, Habits, Focus, Analytics

**Feature: mobile-native-fullbleed-layout, Property 6: Active tab styling invariant**
- Generator: arbitrary `activeSection` value
- Assertion: active tab has `border-primary` and `bg-primary/5` classes; all other tabs do not

**Feature: mobile-native-fullbleed-layout, Property 7: Tab tap always updates activeSection**
- Generator: arbitrary tab from the five tabs
- Assertion: after tapping the tab, `activeSection` equals the tab's id

**Feature: mobile-native-fullbleed-layout, Property 8: Search filtering invariant**
- Generator: arbitrary non-empty search string, arbitrary tasks/habits array
- Assertion: all displayed items contain the search string; no non-matching items are displayed

**Feature: mobile-native-fullbleed-layout, Property 9: Consistent sticky header styling**
- Generator: arbitrary page state for Notes OS or Study OS
- Assertion: top row element has classes `sticky top-0 z-30 bg-background/85 backdrop-blur-2xl border-b border-border/50`

**Feature: mobile-native-fullbleed-layout, Property 10: Consistent search bar styling**
- Generator: arbitrary page state for Notes OS or Study OS
- Assertion: search input has classes `rounded-full bg-muted/50 border-transparent pl-11 h-11`

**Feature: mobile-native-fullbleed-layout, Property 11: MobileTopBar never rendered on mobile**
- Generator: arbitrary mobile viewport width in range [320, 767]
- Assertion: neither Notes OS nor Study OS renders a MobileTopBar component

### Integration / Visual Tests

- Verify the animated sliding pill in the Notes OS scope switcher matches the Library page animation visually
- Verify the VS Code tab switcher active state (2px border, bg-primary/5) renders correctly in both light and dark themes
- Verify safe area inset padding renders correctly on a device with a notch (iPhone 14 Pro or simulator)
- Verify horizontal slide animation between Study OS tabs is smooth and directionally correct (left tab → slides from left, right tab → slides from right)
- Verify the sticky tab switcher remains visible while the content area scrolls
