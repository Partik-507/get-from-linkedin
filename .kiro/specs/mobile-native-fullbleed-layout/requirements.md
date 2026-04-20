# Requirements Document

## Introduction

This feature replaces the existing mobile top header bars on the Notes OS page (`/notes`) and Study OS page (`/study`) with a full-bleed, mobile-native layout identical to the pattern already implemented on the Library page (`/resources`). The goal is a seamless, immersive experience with no separate header bar — the background is continuous, the top row is inline content, and all interactive elements flow naturally below it. The Library page serves as the canonical reference implementation.

## Glossary

- **Notes_OS_Page**: The mobile view of the `/notes` route, showing the notes page list and editor.
- **Study_OS_Page**: The mobile view of the `/study` route, showing calendar, tasks, habits, focus, and analytics sections.
- **Library_Page**: The mobile view of the `/resources` route — the reference implementation for the full-bleed pattern.
- **Full_Bleed_Layout**: A layout where the page background is continuous from top to bottom with no visually distinct header bar. The top row contains navigation controls inline with the content.
- **Sidebar_Drawer**: A slide-in panel from the left edge, triggered by the hamburger/drawer-opener icon, containing navigation or page tree content.
- **Mode_Menu**: A popup/dropdown triggered by the three-dot icon, presenting mode-switching options.
- **Search_Bar**: An inline search input rendered below the top row, not inside a separate header.
- **Read_Write_Toggle**: A segmented control on the Notes OS page for switching between Mine, Public, and Space workspaces.
- **Tab_Switcher**: A VS Code-style horizontal tab bar on the Study OS page where each tab is connected to its own content view (Calendar, Tasks, Habits, Focus, Analytics).
- **MobileTopBar**: The existing `MobileTopBar` component currently used as a separate header on some pages.
- **Layout**: The shared `Layout` component wrapping all pages, which accepts a `fullBleed` prop to suppress the global header on mobile.

---

## Requirements

### Requirement 1: Notes OS — Remove Existing Mobile Top Header

**User Story:** As a mobile user on the Notes OS page, I want the separate top header bar removed, so that the page feels like a native mobile app with a seamless, full-bleed background.

#### Acceptance Criteria

1. THE Notes_OS_Page SHALL render with `fullBleed` mode on mobile, removing the global `MobileTopBar` component from the Notes OS mobile view.
2. WHEN the Notes OS page loads on a mobile viewport (width < 768px), THE Notes_OS_Page SHALL NOT display a separate fixed header bar above the content.
3. THE Notes_OS_Page SHALL use the same `bg-background` continuous background as the Library_Page, with no visual separation between the top row and the content below.

---

### Requirement 2: Notes OS — Full-Bleed Top Row

**User Story:** As a mobile user, I want the Notes OS top row to contain a drawer opener, page heading, and three-dot menu inline with the content, so that the layout feels native and immersive.

#### Acceptance Criteria

1. THE Notes_OS_Page SHALL render a top row (56px tall, `sticky top-0`, `z-30`, `bg-background/85 backdrop-blur-2xl`) containing three elements: a hamburger/drawer-opener icon on the left, the text "Notes OS" centered, and a three-dot (`MoreHorizontal`) icon on the right.
2. WHEN the drawer-opener icon is tapped, THE Sidebar_Drawer SHALL slide in from the left, identical in behavior to the Library_Page folder drawer.
3. WHEN the three-dot icon is tapped, THE Mode_Menu SHALL open as a dropdown/popup presenting three options: "Mine", "Public", and "Space".
4. WHEN a mode option is selected from the Mode_Menu, THE Notes_OS_Page SHALL switch the active workspace to the selected mode (Mine → `world = "my"`, Public → `world = "public"`, Space → `world = "space"`).
5. THE Notes_OS_Page top row SHALL apply `paddingTop: env(safe-area-inset-top, 0px)` to respect device safe areas.

---

### Requirement 3: Notes OS — Inline Search Bar

**User Story:** As a mobile user, I want a search bar directly below the top row on the Notes OS page, so that I can filter notes without navigating to a separate search screen.

#### Acceptance Criteria

1. THE Notes_OS_Page SHALL render a Search_Bar below the top row, styled as a full-width rounded pill input (height 44px, `rounded-full`, `bg-muted/50`, search icon on the left).
2. WHEN the Search_Bar receives focus, THE Notes_OS_Page SHALL expand into a full search experience (the existing `CommandPalette` or inline filter behavior).
3. THE Search_Bar SHALL be positioned between the top row and the Read_Write_Toggle, with 16px horizontal padding.

---

### Requirement 4: Notes OS — Read/Write Toggle Below Search

**User Story:** As a mobile user, I want the Mine/Public/Space workspace switcher to appear below the search bar, so that the layout hierarchy is clear and consistent with the Library page pattern.

#### Acceptance Criteria

1. THE Notes_OS_Page SHALL render the Read_Write_Toggle (Mine / Public / Space segmented control) below the Search_Bar, with 16px horizontal margin, 36px height, and a sliding white pill animation.
2. WHEN a segment is selected in the Read_Write_Toggle, THE Notes_OS_Page SHALL update the active workspace (`world` state) to the corresponding value.
3. THE Read_Write_Toggle SHALL use the same animated sliding pill implementation as the Library_Page scope switcher (Public / My Resources).

---

### Requirement 5: Notes OS — Full-Bleed Content Flow

**User Story:** As a mobile user, I want the notes page list to flow seamlessly below the search and toggle controls, so that the entire page feels like one continuous native surface.

#### Acceptance Criteria

1. THE Notes_OS_Page SHALL render the page list (notes tree) directly below the Read_Write_Toggle with no additional header separation or card borders at the top.
2. THE Notes_OS_Page SHALL maintain the existing `mobileDrawerOpen` state and `NotesSidebar` drawer behavior, now triggered from the new top row drawer-opener icon.
3. WHEN a note is tapped in the page list, THE Notes_OS_Page SHALL open the note editor in a full-screen slide-in view (existing behavior preserved).

---

### Requirement 6: Study OS — Remove Existing Mobile Top Header

**User Story:** As a mobile user on the Study OS page, I want the separate top header bar removed, so that the page feels like a native mobile app with a seamless, full-bleed background.

#### Acceptance Criteria

1. THE Study_OS_Page SHALL render with `fullBleed` mode on mobile, removing the existing `md:hidden` top bar (the 48px bar showing `activeSection` name and Focus button).
2. WHEN the Study OS page loads on a mobile viewport (width < 768px), THE Study_OS_Page SHALL NOT display the existing separate fixed header bar above the section tabs.
3. THE Study_OS_Page SHALL use the same `bg-background` continuous background as the Library_Page.

---

### Requirement 7: Study OS — Full-Bleed Top Row

**User Story:** As a mobile user, I want the Study OS top row to contain a drawer opener, page heading, and consistent right-side controls inline with the content, so that the layout feels native and immersive.

#### Acceptance Criteria

1. THE Study_OS_Page SHALL render a top row (56px tall, `sticky top-0`, `z-30`, `bg-background/85 backdrop-blur-2xl`) containing: a hamburger/drawer-opener icon on the left, the text "Study OS" centered, and a Quick Focus pill button (`⚡ Focus`, 36px tall, `bg-primary/10 text-primary`) on the right.
2. WHEN the drawer-opener icon is tapped, THE Sidebar_Drawer SHALL slide in from the left (the existing `mobileDrawerOpen` drawer with `SidebarContent`).
3. WHEN the Quick Focus button is tapped, THE Study_OS_Page SHALL open the existing focus session modal (`setShowQuickFocus(true)`).
4. THE Study_OS_Page top row SHALL apply `paddingTop: env(safe-area-inset-top, 0px)` to respect device safe areas.

---

### Requirement 8: Study OS — Inline Search Bar

**User Story:** As a mobile user, I want a search bar below the Study OS top row, so that I can search across calendar events, tasks, and habits without a separate screen.

#### Acceptance Criteria

1. THE Study_OS_Page SHALL render a Search_Bar below the top row, styled identically to the Notes OS and Library search bars (full-width rounded pill, 44px height, `bg-muted/50`, search icon on left, placeholder "Search Study OS…").
2. WHEN the Search_Bar value changes, THE Study_OS_Page SHALL filter the content of the active section (events for Calendar, tasks for Tasks, habits for Habits).
3. THE Search_Bar SHALL be positioned between the top row and the Tab_Switcher, with 16px horizontal padding.

---

### Requirement 9: Study OS — Premium VS Code-Style Tab Switcher

**User Story:** As a mobile user, I want a premium tab bar below the search bar on the Study OS page, so that I can switch between Calendar, Tasks, Habits, Focus, and Analytics views with a professional, connected feel.

#### Acceptance Criteria

1. THE Study_OS_Page SHALL render a Tab_Switcher below the Search_Bar containing five tabs: Calendar, Tasks, Habits, Focus, Analytics — each connected to its respective content view.
2. THE Tab_Switcher SHALL use a VS Code-style design: tabs are horizontally scrollable, each tab has an icon and label, the active tab has a 2px bottom border in `hsl(var(--primary))` and a subtle `bg-primary/5` background, inactive tabs have no background.
3. WHEN a tab is tapped, THE Study_OS_Page SHALL set `activeSection` to the corresponding value and display that section's content below.
4. THE Tab_Switcher SHALL replace the existing `md:hidden` horizontal pill tab row (the current `rounded-full` pill buttons).
5. THE Tab_Switcher SHALL be `sticky` below the top row and search bar, so it remains visible while the content scrolls.
6. WHEN the active tab changes, THE Study_OS_Page SHALL animate the content transition with a horizontal slide (new section slides in from the direction of the tab).

---

### Requirement 10: Study OS — Full-Bleed Content Flow

**User Story:** As a mobile user, I want the Study OS section content to flow seamlessly below the tab switcher, so that the entire page feels like one continuous native surface.

#### Acceptance Criteria

1. THE Study_OS_Page SHALL render the active section content (Calendar, Tasks, Habits, Focus, or Analytics) directly below the Tab_Switcher with no additional header separation.
2. THE Study_OS_Page SHALL preserve all existing section content implementations (CalendarView, task list, habit list, focus launcher, analytics charts).
3. THE Study_OS_Page content area SHALL have bottom padding equal to `calc(5rem + env(safe-area-inset-bottom, 0px))` to avoid overlap with the MobileBottomNav.

---

### Requirement 11: Consistency with Library Page Pattern

**User Story:** As a mobile user, I want the Notes OS and Study OS pages to feel visually consistent with the Library page, so that the app has a unified, premium mobile-native design language.

#### Acceptance Criteria

1. THE Notes_OS_Page top row SHALL use the same sticky header styling as the Library_Page header (`sticky top-0 z-30 bg-background/85 backdrop-blur-2xl border-b border-border/50`).
2. THE Study_OS_Page top row SHALL use the same sticky header styling as the Library_Page header.
3. THE Notes_OS_Page Search_Bar SHALL use the same visual style as the Library_Page search bar (`rounded-full`, `bg-muted/50`, `border-transparent`, `pl-11`, `h-11`).
4. THE Study_OS_Page Search_Bar SHALL use the same visual style as the Library_Page search bar.
5. IF the user is on a mobile viewport, THEN THE Notes_OS_Page and Study_OS_Page SHALL NOT render the `MobileTopBar` component.
