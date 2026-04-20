VIVAVAULT — MOBILE STUDY OS AND NOTES OS COMPLETE REDESIGN
File: MOBILE-02 — Study OS and Notes OS Mobile Full Redesign

Apply COMMON-01 before this. This redesigns Study OS and Notes OS for mobile.

---

CURRENT PROBLEMS IN MOBILE STUDY OS

The screenshot shows: a hamburger icon on the left, "Calendar" in the header center, a "Focus" button on the top right (a purple pill button), then a horizontal scrollable pill tab row (Calendar active in purple, Tasks, Habits, Focus, Analytics as outlined pills), then a day view calendar for Sunday April 19 with left/right arrows, and the hourly timeline showing 4 PM through 11 PM. The FAB is at the bottom right. The bottom nav has Study selected.

Problems: The header says "Calendar" instead of "Study OS" — the header should show the module name, not the current section. The Focus button in the top right is a purple pill which is good but it appears before the user has configured their focus settings (there is no duration shown). The horizontal pill tabs are the right pattern but the Calendar pill is much wider than the others due to its icon, creating uneven visual rhythm. The day view shows hours from 4 PM to 11 PM but starts too late in the day — on first open it should scroll to show the current time in the visible area, not start at the top of the scroll.

---

MOBILE STUDY OS REDESIGN

FIXED HEADER (56 pixels):
Left: a hamburger icon (three lines, 24 pixels) that opens the left drawer (the sidebar content from desktop adapts to a drawer here). Center: "Study OS" in 17 pixels semibold (NOT "Calendar" — the module name, not the tab name). Right: a "⚡ Quick Focus" pill button (36 pixels tall, purple filled, white text with lightning icon). Tapping Quick Focus opens the duration and mode selection modal.

HORIZONTAL PILL TABS (below header, full width, horizontal scroll):
Five pills: Calendar, Tasks, Habits, Focus, Analytics. Each pill is 36 pixels tall, 16 pixels horizontal padding. Active: solid purple background, white text. Inactive: light gray background, dark gray text. All pills have 22 pixel radius (fully rounded). Equal gap of 8 pixels between pills. The tab row has 16 pixels horizontal padding on each side and scrolls if needed. Switching tabs uses a horizontal slide transition.

CALENDAR TAB CONTENT:

WEEK STRIP (below tabs, fixed above the scrollable timeline):
A 7-day horizontal strip showing the current week. Each day: abbreviated day name (Mon, Tue...) in 11 pixels gray above, date number in 16 pixels bold below. Today's date number has a purple filled circle (30 pixels) with white text. Days with events have a small purple dot (5 pixels) below the date number. The strip is 56 pixels tall. Tapping a day navigates to that day's timeline.

SCROLLABLE TIMELINE (fills remaining screen height):
Left column (40 pixels) shows hour labels in 11 pixels gray. The rest is the day's event area. Hour rows are 56 pixels tall (slightly shorter than desktop to fit mobile). The current time red line is visible. The empty slots show a "+" hint on tap to create an event.

The timeline auto-scrolls on load to position the current time in the upper third of the visible area so the student sees their upcoming hours, not an empty past.

TASK CREATION ON MOBILE:
Tapping any empty time slot opens a bottom sheet for quick event creation (as described in previous mobile prompt files).

TASKS TAB CONTENT:
When the user taps Tasks tab: a full-height scrollable list. At the top: a quick-add bar (full width input, 44 pixels, "Add a task... or press T" placeholder, rounded). Below: Today's tasks section and Inbox section. Each task row is 52 pixels with checkbox, title, priority dot. Swiping left reveals delete/edit quick actions.

HABITS TAB CONTENT:
When the user taps Habits tab: a full-height scrollable list. At the top: the today summary bar ("1 of 4 habits done today" in 14 pixels). Below: habit cards (each 72 pixels tall). Each card shows the habit emoji, name, streak, and the completion circle/checkbox on the right. Below the list: a centered "+ New Habit" button.

FOCUS TAB CONTENT:
When the user taps Focus tab: a full-height page showing the focus launcher. A large centered card (showing within the scroll area): a timer illustration showing the last session or a start timer, the mode selector, duration presets, and a large "Start Focus Session" button in purple at the bottom.

ANALYTICS TAB CONTENT:
When the user taps Analytics: scrollable cards showing the heatmap, daily patterns chart, and other analytics described in previous prompt files.

STUDY OS LEFT DRAWER (opens via hamburger):
The drawer slides in from the left (280 pixels wide). Contains: STUDY OS label, focus time and streak stats, the five navigation items with their icons (same as the sidebar on desktop), a divider, mini month calendar, My Calendars, Other Calendars sections with checkboxes, a divider, and a "+ Connect Google Calendar" button at the bottom. Closing: tap the overlay, swipe left on the drawer, or tap the hamburger again.

---

CURRENT PROBLEMS IN MOBILE NOTES OS

The screenshot shows the Notes editor open directly on the page (not a page list view first). The header shows: a sidebar toggle icon on the far left (a panel icon), then Mine/Public/Space as tab buttons (no underline, just text), then "Untitled" as the page title. This is the editor view not the page list view. The editor content shows the note title and body text.

The page icon (a document illustration SVG) and the note title "Untitled" and dates "Created 4/19/2026 · Updated 4/19/2026" are visible. Below: "Add tag..." placeholder. Below: a cursor line. Below: the note content.

Problems: The Mine/Public/Space tabs at the top of the editor are in the wrong location — they should affect what the page list shows, not appear in the editor header. The sidebar toggle icon at the top left is positioned correctly but its function is unclear — it opens a drawer but there is no visual indicator that the drawer exists. The page title area needs better visual treatment on mobile. The editor has no keyboard toolbar visible (it doesn't appear until the keyboard is open, but the toolbar mechanism needs to be there).

---

MOBILE NOTES OS HOME SCREEN (PAGE LIST)

When the user taps Notes in the bottom bar, they FIRST see the page list, not the editor. The editor opens only when they tap a specific page.

FIXED HEADER (56 pixels):
Left: a panel drawer toggle icon (two vertical rectangles, 24 pixels) — tapping opens the left drawer with the full page tree. Center: the current workspace name ("My Notes", "Public Notes", or "Space") in 17 pixels semibold. Right: search icon (opens inline search) and three-dot menu icon.

BELOW HEADER — WORKSPACE SWITCHER:
A full-width segmented control (same as described in previous mobile prompts). Mine, Public, Space. Gray background, white sliding pill, 36 pixels tall, standard radius. Switching shows the correct page tree. 16 pixels horizontal margin.

BELOW SWITCHER — PAGE FILTER INPUT:
Full-width search input (40 pixels tall, light gray background, rounded, "Filter pages..." placeholder). Filters the page tree in real time.

BELOW FILTER — PAGE TREE:
A scrollable list of pages in the current workspace. Each page row: 52 pixels tall, 16 pixels padding. Page icon (emoji or default) on the left. Page title in 15 pixels. If the page has children: a chevron on the far right that expands the children inline with indentation. Swipe left on a page row to reveal Delete, Move, and Duplicate quick actions.

At the bottom of the page list: a "+ New Page" row (with a purple plus icon and "New page" text, full width, 48 pixels tall) as the last item in the list. Not a floating button, to keep the layout clean.

NOTES OS LEFT DRAWER:
The drawer contains the full Obsidian-style nested page tree. It slides in from the left and covers the page list. The drawer header shows the workspace name and a close button. The tree shows folders and pages with proper indentation. At the bottom: Import, Settings, New Folder action buttons.

---

MOBILE NOTES EDITOR (full screen, slides in from the right when a page is tapped)

HEADER (56 pixels):
Left: back chevron (returns to page list). Center: page title in 15 pixels (truncated). Right: read/edit mode toggle icon, share icon, three-dot menu icon.

EDITOR CONTENT:
The page starts with the page icon (emoji, 48 pixels, tappable to change), page title (28 pixels bold, editable), dates row (13 pixels gray), tags row, and the TipTap content.

KEYBOARD ACCESSORY TOOLBAR:
When the user taps anywhere in the editor and the keyboard opens, a 44-pixel tall formatting toolbar appears stuck to the top of the keyboard. It contains: Bold, Italic, Underline, Strikethrough, Code, Highlight, Link, then H1, H2, Bullet List, Numbered List, Task, Quote, Divider, and a slash command trigger icon. The toolbar scrolls horizontally. This is essential for mobile note editing.

The read/edit mode toggle in the header: in edit mode (pencil icon), the editor is fully interactive. Tapping the toggle switches to read mode (eye icon). In read mode: the editor becomes non-editable, the keyboard toolbar disappears, the mobile header fades out, the bottom nav fades out, and only the content is visible with a small floating button (pencil in a circle) in the top right to exit read mode.

THREE-DOT MENU options in editor header: Share, Publish, Export, Version History, Move to folder, Duplicate, Add cover, Change icon, Delete (in red).
